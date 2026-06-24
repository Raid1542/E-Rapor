/**
 * Nama File: DataTahunAjaranClient.tsx
 * Fungsi: Komponen klien untuk mengelola data tahun ajaran
 * UPDATE: 
 *   - Modal ganti semester baru dengan field alasan wajib
 *   - Tampilan lebih simple dan user-friendly
 *   - Warna konsisten dengan tema oranye
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, X, RotateCw, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, ArrowRight, Calendar } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes ta-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ta-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ta-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    @keyframes ta-slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .ta-fadeIn  { animation: ta-fadeIn  0.2s ease; }
    .ta-scaleIn { animation: ta-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ta-pulse   { animation: ta-pulse   0.6s ease 0.15s; }
    .ta-slideUp { animation: ta-slideUp 0.4s ease-out forwards; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

// ─── NOTIF MODAL (UPDATED) ────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: {
        iconBg: 'bg-green-50',
        ring: 'ring-green-100',
        icon: (
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={64} className="text-green-500" />
                </div>
            </div>
        ),
        btn: 'bg-green-500 hover:bg-green-600'
    },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 ta-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col items-center ta-scaleIn overflow-hidden">
                {/* Close button */}
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                        <X size={20} />
                    </button>
                )}

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-4 w-full">
                    {/* Icon */}
                    <div className="mt-2">
                        {s.icon}
                    </div>

                    {/* Title & Message */}
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                            {modal.message}
                        </p>
                    </div>

                    {/* Button */}
                    {isConfirm ? (
                        <div className="flex gap-3 w-full mt-2">
                            <button onClick={onClose}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                            >
                                Ya, Lanjutkan
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`w-full mt-4 ${s.btn} text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg hover:shadow-xl`}
                            style={modal.type === 'success' ? {
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                            } : {}}
                        >
                            OK, Mengerti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

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

// ─── INTERFACES ───────────────────────────────────────────────────────────────

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

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return '-';
    const [year, month, day] = cleanDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '-';
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${hari}, ${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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
    const [confirmClosing, setConfirmClosing] = useState(false);

    // ✅ STATE BARU untuk alasan ganti semester
    const [alasanKoreksi, setAlasanKoreksi] = useState('');
    const [showAlasanLainnya, setShowAlasanLainnya] = useState(false);
    const [alasanCustom, setAlasanCustom] = useState('');

    const [showConfirmTambah, setShowConfirmTambah] = useState(false);
    const [confirmTambahClosing, setConfirmTambahClosing] = useState(false);

    // ── Fetch Data ─────────────────────────────────────────────────────────────
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

    useEffect(() => { fetchTahunAjaran(); }, [fetchTahunAjaran]);

    // ── Form State ─────────────────────────────────────────────────────────────
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

    // ── Form Handlers ──────────────────────────────────────────────────────────
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!formData.tahun1 || !formData.tahun2) errs.tahun = 'Tahun ajaran wajib diisi';
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setFormData({ tahun1: '', tahun2: '', pts_ganjil: '', pas_ganjil: '', pts_genap: '', pas_genap: '' });
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

    // Buka Modal Konfirmasi Tambah
    const openConfirmTambah = () => {
        if (!validate()) return;
        setShowConfirmTambah(true);
    };

    // Tutup Modal Konfirmasi
    const closeConfirmTambah = () => {
        setConfirmTambahClosing(true);
        setTimeout(() => {
            setShowConfirmTambah(false);
            setConfirmTambahClosing(false);
        }, 200);
    };

    // Tambah Tahun Ajaran 
    const handleTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    tahun1: formData.tahun1, tahun2: formData.tahun2,
                    pts_ganjil: formData.pts_ganjil || null, pas_ganjil: formData.pas_ganjil,
                    pts_genap: formData.pts_genap || null, pas_genap: formData.pas_genap,
                }),
            });
            if (res.ok) {
                setShowTambah(false);
                resetForm();
                await fetchTahunAjaran();

                // ✅ TAMBAHKAN: Dispatch event untuk update Header & Sidebar
                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                window.dispatchEvent(new CustomEvent('semesterUpdated'));
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());
                localStorage.setItem('semesterUpdated', Date.now().toString());

                showModal({
                    type: 'success',
                    title: 'Berhasil Ditambahkan!',
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

    // ── Edit Tahun Ajaran ──────────────────────────────────────────────────────
    const openEdit = (item: TahunAjaran) => {
        const [t1, t2] = item.tahun_ajaran.split('/');
        setEditId(item.id_induk);

        const data = {
            tahun1: t1 || '', tahun2: t2 || '',
            pts_ganjil: item.pts_ganjil || '', pas_ganjil: item.pas_ganjil || '',
            pts_genap: item.pts_genap || '', pas_genap: item.pas_genap || '',
        };

        setFormData(data);
        setOriginalFormData(data);
        setErrors({});
        setShowEdit(true);
    };

    const handleEdit = async () => {
        if (!validate() || !editId) return;
        if (!hasChanges()) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Tidak ada tanggal PTS/PAS yang berubah. Tidak perlu menyimpan.'
            });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/tahun-ajaran/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    pts_ganjil: formData.pts_ganjil || null, pas_ganjil: formData.pas_ganjil,
                    pts_genap: formData.pts_genap || null, pas_genap: formData.pas_genap,
                }),
            });
            if (res.ok) {
                setShowEdit(false);
                setEditId(null);
                await fetchTahunAjaran();

                // ✅ TAMBAHKAN: Dispatch event untuk update Header & Sidebar
                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());

                showModal({ type: 'success', title: 'Data Diperbarui!', message: 'Tahun ajaran berhasil diperbarui.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ── Buka Modal Konfirmasi Ganti Semester ───────────────────────────────────
    const openConfirmGantiSemester = (item: TahunAjaran) => {
        setSelectedItemForSemester(item);
        setShowConfirmGantiSemester(true);
        // Reset form alasan
        setAlasanKoreksi('');
        setAlasanCustom('');
        setShowAlasanLainnya(false);
    };

    // ── Tutup Modal Konfirmasi ─────────────────────────────────────────────────
    const closeConfirmGantiSemester = () => {
        setConfirmClosing(true);
        setTimeout(() => {
            setShowConfirmGantiSemester(false);
            setConfirmClosing(false);
            setSelectedItemForSemester(null);
            setAlasanKoreksi('');
            setAlasanCustom('');
            setShowAlasanLainnya(false);
        }, 200);
    };

    // ── Eksekusi Ganti Semester (dengan alasan) ────────────────────────────────
    const executeGantiSemester = async () => {
        if (!selectedItemForSemester) return;

        // ✅ Validasi alasan
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
            closeConfirmGantiSemester();
            return;
        }

        closeConfirmGantiSemester();

        try {
            const res = await fetch(`http://localhost:5000/api/admin/tahun-ajaran/${item.id_induk}/semester`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    semester_baru: semesterBaru,
                    alasan: alasanFinal
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                await fetchTahunAjaran();

                // ✅ TAMBAHKAN: Dispatch event untuk update Header & Sidebar
                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                window.dispatchEvent(new CustomEvent('semesterUpdated'));

                // ✅ Update localStorage untuk trigger storage event
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());
                localStorage.setItem('semesterUpdated', Date.now().toString());

                // Reset form
                setAlasanKoreksi('');
                setAlasanCustom('');
                setShowAlasanLainnya(false);

                // Tampilkan success dengan info lengkap
                let successMessage = data.message || `Semester berhasil diganti ke ${semesterBaru}.`;
                if (data.data?.catatan) {
                    successMessage += `\n\n${data.data.catatan}`;
                }

                showModal({
                    type: 'success',
                    title: '✅ Semester Berhasil Diganti!',
                    message: successMessage
                });

            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Ganti Semester',
                    message: data.message || 'Terjadi kesalahan saat mengganti semester.'
                });
            }
        } catch (err: any) {
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server.'
            });
        }
    };

    // ── Filter & Pagination ────────────────────────────────────────────────────
    const filteredData = tahunAjaranList.filter((item) => {
        const query = searchQuery.toLowerCase().trim();
        return !query || item.tahun_ajaran.toLowerCase().includes(query);
    });

    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive = "text-white border-orange-500";
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
        range.forEach((p) => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
            else {
                pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}>{p}</button>);
            }
        });

        pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>);
        return pages;
    };

    // ── Secondary Buttons ──────────────────────────────────────────────────────
    const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
        <button onClick={onClick} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            {children}
        </button>
    );

    // ── FORM PAGE ──────────────────────────────────────────────────────────────
    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola tahun ajaran dan semester aktif</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">{isEdit ? 'Edit' : 'Tambah'} Tahun Ajaran</h2>
                    <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <X size={16} className="text-white" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Tahun Ajaran */}
                    <div className="mb-6">
                        <label className={labelCls} style={labelColor}>Tahun Ajaran <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-3">
                            <input type="text" name="tahun1" value={formData.tahun1} onChange={handleInputChange} placeholder="2024"
                                className={`w-32 ${errors.tahun ? inputErrCls : inputCls}`} disabled={isEdit} />
                            <span className="text-2xl font-bold">/</span>
                            <input type="text" name="tahun2" value={formData.tahun2} onChange={handleInputChange} placeholder="2025"
                                className={`w-32 ${errors.tahun ? inputErrCls : inputCls}`} disabled={isEdit} />
                        </div>
                        {errors.tahun && <p className="text-red-500 text-xs mt-1">{errors.tahun}</p>}
                    </div>

                    {/* Semester Ganjil */}
                    <div className="mb-6 p-4 rounded-lg border" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#c2410c' }}>📚 Semester Ganjil</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Tanggal Pembagian PTS</label>
                                <input type="date" name="pts_ganjil" value={formData.pts_ganjil} onChange={handleInputChange} className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Tanggal Pembagian PAS</label>
                                <input type="date" name="pas_ganjil" value={formData.pas_ganjil} onChange={handleInputChange} className={errors.pas_ganjil ? inputErrCls : inputCls} />
                            </div>
                        </div>
                    </div>

                    {/* Semester Genap */}
                    <div className="mb-6 p-4 rounded-lg border" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#15803d' }}>📗 Semester Genap</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Tanggal Pembagian PTS</label>
                                <input type="date" name="pts_genap" value={formData.pts_genap} onChange={handleInputChange} className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Tanggal Pembagian PAS</label>
                                <input type="date" name="pas_genap" value={formData.pas_genap} onChange={handleInputChange} className={errors.pas_genap ? inputErrCls : inputCls} />
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                        <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}>Batal</BtnSecondary>
                        <BtnSecondary onClick={resetForm}>Reset</BtnSecondary>
                        <button
                            onClick={isEdit ? handleEdit : openConfirmTambah}
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

            {!isEdit && showConfirmTambah && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${confirmTambahClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeConfirmTambah(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-200 ${confirmTambahClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Konfirmasi Tambah Tahun Ajaran</h2>
                            <button onClick={closeConfirmTambah} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm font-bold text-blue-800 mb-2">INFO PENTING!</p>
                                <p className="text-sm text-blue-900">
                                    Anda akan menambahkan tahun ajaran <strong className="text-lg">{formData.tahun1}/{formData.tahun2}</strong>.
                                </p>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <h3 className="font-bold text-orange-800 mb-3 text-sm">DENGAN MENYIMPAN, MAKA:</h3>
                                <ul className="space-y-2 text-sm text-orange-900">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-orange-600">✓</span>
                                        <span>Tahun ajaran <strong>{formData.tahun1}/{formData.tahun2}</strong> akan otomatis <strong className="text-green-700">AKTIF</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-orange-600">✓</span>
                                        <span>Tahun ajaran yang sebelumnya aktif akan otomatis <strong className="text-gray-700">NONAKTIF</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-orange-600">✓</span>
                                        <span>Semester default: <strong>Ganjil</strong> (bisa diubah nanti)</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={closeConfirmTambah} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                    Batal, Cek Dulu
                                </button>
                                <button
                                    onClick={() => { closeConfirmTambah(); handleTambah(); }}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}>
                                    Tambah & Aktifkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola tahun ajaran dan semester aktif</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button onClick={() => setShowTambah(true)} className={btnPrimary.base} style={btnPrimary.style}
                            onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                            <Plus size={16} /> Tambah Tahun Ajaran
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200">
                                    <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            <div className="relative min-w-[200px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari tahun ajaran..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}><X className="w-4 h-4" /></button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredData.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredData.length)} dari {filteredData.length} data
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Tahun Ajaran', 'PTS Ganjil', 'PAS Ganjil', 'PTS Genap', 'PAS Genap', 'Semester Aktif', 'Status', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        Memuat data...
                                    </div>
                                </td></tr>
                            ) : currentData.length === 0 ? (
                                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">Tidak ada data tahun ajaran</td></tr>
                            ) : (
                                currentData.map((item, index) => (
                                    <tr key={item.id_induk} className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                        <td className="px-5 py-3.5 text-center font-bold text-gray-800">{item.tahun_ajaran}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-700">{formatTanggalIndonesia(item.pts_ganjil)}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-700">{formatTanggalIndonesia(item.pas_ganjil)}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-700">{formatTanggalIndonesia(item.pts_genap)}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-700">{formatTanggalIndonesia(item.pas_genap)}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            {item.semester_aktif ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                    style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                                                    🎓 {item.semester_aktif}
                                                </span>
                                            ) : <span className="text-gray-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${item.status === 'AKTIF' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${item.status === 'AKTIF' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                {item.status === 'AKTIF' && (
                                                    <button onClick={() => openEdit(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                                    >
                                                        <Pencil size={13} /> Edit
                                                    </button>
                                                )}

                                                {/* Tombol Ganti Semester hanya untuk TA AKTIF */}
                                                {item.status === 'AKTIF' && (
                                                    <button onClick={() => openConfirmGantiSemester(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                                    >
                                                        <RotateCw size={13} /> Ganti {item.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil'}
                                                    </button>
                                                )}

                                                {/* Indikator Read-Only untuk TA Non-Aktif */}
                                                {item.status !== 'AKTIF' && (
                                                    <span className="text-xs text-gray-700">-</span>
                                                )}
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
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MODAL KONFIRMASI GANTI SEMESTER (UPDATED)
            ═══════════════════════════════════════════════════════════════════ */}
            {showConfirmGantiSemester && selectedItemForSemester && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${confirmClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeConfirmGantiSemester(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-200 ${confirmClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    Ganti Semester
                                </h2>
                                <p className="text-xs text-white/80 mt-0.5">Konfirmasi pergantian semester aktif</p>
                            </div>
                            <button onClick={closeConfirmGantiSemester} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Info Pergantian */}
                            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-center flex-1">
                                        <span className="inline-block px-3 py-1.5 rounded-lg font-bold bg-white border border-gray-200">
                                            {selectedItemForSemester.semester_aktif}
                                        </span>
                                    </div>
                                    <div className="text-2xl px-2">→</div>
                                    <div className="text-center flex-1">
                                        <span className="inline-block px-3 py-1.5 rounded-lg font-bold"
                                            style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#c95b08' }}>
                                            {selectedItemForSemester.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-gray-600">
                                    Tahun Ajaran: <strong>{selectedItemForSemester.tahun_ajaran}</strong>
                                </p>
                            </div>

                            {/* Info Penting */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    Informasi Penting
                                </h4>
                                <ul className="text-xs text-blue-800 space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 font-bold">✓</span>
                                        <span>Data nilai siswa <strong>TIDAK hilang</strong>, tetap tersimpan di semester asal</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 font-bold">✓</span>
                                        <span>Guru kelas dapat <strong>melanjutkan input</strong> di semester yang dipilih</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500 font-bold">✓</span>
                                        <span>Dapat <strong>bolak-balik</strong> untuk koreksi nilai jika diperlukan</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Field Alasan */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
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

                            {/* Tombol Aksi */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={closeConfirmGantiSemester}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={executeGantiSemester}
                                    disabled={!alasanKoreksi && !(showAlasanLainnya && alasanCustom.trim())}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                                    onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'); }}
                                    onMouseLeave={e => { if (!e.currentTarget.disabled) (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'); }}
                                >
                                    Ganti Semester
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}