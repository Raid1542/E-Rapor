/**
 * Nama File: data_siswa_client.tsx
 * Fungsi: Komponen klien untuk mengelola data siswa (master data),
 *         mencakup fitur tambah, edit, detail, import Excel, filter,
 *         pencarian, dan pagination.
 * UPDATE: Menggunakan struktur master data (tanpa tahun ajaran)
 * UPDATE 2: Form tambah/edit pakai pola back-button + header card,
 *           tombol Batal/Reset disamakan dengan Data Admin & Tahun Ajaran.
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search, Filter, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, ChevronLeft, GraduationCap } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
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

// ─── SECONDARY BUTTONS — disamakan dengan Data Admin (Batal=merah, Reset=biru) ──

const BtnBatal = ({ onClick, children = 'Batal' }: { onClick: () => void; children?: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
    >
        {children}
    </button>
);

const BtnReset = ({ onClick, children = 'Reset' }: { onClick: () => void; children?: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
    >
        {children}
    </button>
);

/** Tombol netral (untuk "Tutup" di modal Detail — bukan Batal/Reset, jadi tetap netral) */
const BtnNetral = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface Siswa {
    id_siswa: number;
    nis: string;
    nisn: string;
    nama_lengkap: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    alamat: string;
    status: string;
}

interface FormDataType {
    nis: string;
    nisn: string;
    nama_lengkap: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    alamat: string;
    status: string;
}

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataSiswaClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const formatGender = (g?: string | null) => {
        if (!g) return '-';
        const s = String(g).trim().toLowerCase();
        if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
        if (s === 'perempuan' || s === 'p') return 'Perempuan';
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
    };

    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
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

    // ✅ TAMBAHAN: State untuk modal konfirmasi
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── fetch ──────────────────────────────────────────────────────────────────

    const fetchSiswa = useCallback(async (page = 1, limit = 100) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            // ✅ KIRIM PARAMETER PAGINATION
            const res = await fetch(
                `http://localhost:5000/api/admin/siswa-master?page=${page}&limit=${limit}&status=semua`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const data = await res.json();
            if (res.ok) {
                setSiswaList(Array.isArray(data.data) ? data.data : []);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchSiswa(); }, [fetchSiswa]);

    const [formData, setFormData] = useState<FormDataType>({
        nis: '',
        nisn: '',
        nama_lengkap: '',
        tempat_lahir: '',
        tanggal_lahir: '',
        jenis_kelamin: '',
        alamat: '',
        status: 'aktif',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleDetail = (siswa: Siswa) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    const handleEdit = (siswa: Siswa) => {
        setEditId(siswa.id_siswa);
        setFormData({
            nis: siswa.nis || '',
            nisn: siswa.nisn || '',
            nama_lengkap: siswa.nama_lengkap || '',
            tempat_lahir: siswa.tempat_lahir || '',
            tanggal_lahir: siswa.tanggal_lahir || '',
            jenis_kelamin: siswa.jenis_kelamin || '',
            alamat: siswa.alamat || '',
            status: siswa.status || 'aktif',
        });
        setShowEdit(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = (isEdit: boolean): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nis?.trim()) ne.nis = 'NIS wajib diisi';
        if (!formData.nama_lengkap?.trim()) ne.nama_lengkap = 'Nama lengkap wajib diisi';
        if (!formData.jenis_kelamin) ne.jenis_kelamin = 'Pilih jenis kelamin';
        if (!formData.status) ne.status = 'Status wajib dipilih';

        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            return false;
        }
        return true;
    };

    // ✅ TAMBAHAN: Buka modal konfirmasi
    const openConfirmModal = (action: 'add' | 'edit') => {
        if (action === 'edit') {
            const originalData = siswaList.find(s => s.id_siswa === editId);
            if (!originalData) return;
            const normalize = (str?: string | null) => (str || '').trim().toLowerCase();
            const hasChanged =
                formData.nis !== (originalData.nis || '') ||
                formData.nisn !== (originalData.nisn || '') ||
                formData.nama_lengkap !== (originalData.nama_lengkap || '') ||
                formData.tempat_lahir !== (originalData.tempat_lahir || '') ||
                formData.tanggal_lahir !== (originalData.tanggal_lahir || '') ||
                normalize(formData.jenis_kelamin) !== normalize(originalData.jenis_kelamin) ||
                formData.alamat !== (originalData.alamat || '') ||
                formData.status !== (originalData.status || 'aktif');
            if (!hasChanged) {
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
                return;
            }
        }
        if (!validate(action === 'edit')) return;
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    // ✅ TAMBAHAN: Eksekusi tambah (setelah konfirmasi)
    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/admin/siswa-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn || null,
                    nama_lengkap: formData.nama_lengkap,
                    tempat_lahir: formData.tempat_lahir || null,
                    tanggal_lahir: formData.tanggal_lahir || null,
                    jenis_kelamin: formData.jenis_kelamin,
                    alamat: formData.alamat || null,
                }),
            });
            if (res.ok) {
                setShowTambah(false);
                handleReset();
                await fetchSiswa();
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data siswa ${formData.nama_lengkap} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.code === 'DUPLICATE_NIS' || err.code === 'DUPLICATE_NISN' || err.message?.includes('sudah terdaftar');
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data siswa.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    // ✅ TAMBAHAN: Eksekusi edit (setelah konfirmasi)
    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/siswa-master/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn || null,
                    nama_lengkap: formData.nama_lengkap,
                    tempat_lahir: formData.tempat_lahir || null,
                    tanggal_lahir: formData.tanggal_lahir || null,
                    jenis_kelamin: formData.jenis_kelamin,
                    alamat: formData.alamat || null,
                    status: formData.status,
                }),
            });
            if (res.ok) {
                setShowEdit(false);
                setEditId(null);
                handleReset();
                await fetchSiswa();
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data siswa ${formData.nama_lengkap} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.code === 'DUPLICATE_NIS' || err.code === 'DUPLICATE_NISN' || err.message?.includes('sudah terdaftar');
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data siswa.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const handleReset = () => {
        setFormData({
            nis: '',
            nisn: '',
            nama_lengkap: '',
            tempat_lahir: '',
            tanggal_lahir: '',
            jenis_kelamin: '',
            alamat: '',
            status: 'aktif',
        });
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
            const res = await fetch('http://localhost:5000/api/admin/siswa-master/import', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });

            const result = await res.json();

            if (res.ok) {
                setShowImport(false);
                setImportFile(null);
                await fetchSiswa();

                if (result.skipped && result.skipped.length > 0) {
                    const skippedCount = result.skipped.length;

                    // ✅ HANYA AUTO-DOWNLOAD JIKA ERROR > 5
                    if (skippedCount > 5) {
                        downloadErrorReport(result.skipped);
                    }

                    const summaryLines = [
                        `Berhasil: ${result.total} siswa`,
                        `Dilewati: ${skippedCount} siswa (duplikat)`,
                        '',
                        skippedCount <= 5
                            ? 'Data yang dilewati:'
                            : `Contoh error (3 dari ${skippedCount}):`,
                        ...result.skipped.slice(0, skippedCount <= 5 ? skippedCount : 3).map((d: any, i: number) =>
                            `${i + 1}. Baris ${d.row}: ${d.nama} - ${d.reason}`
                        ),
                        ...(skippedCount > 5 ? [`\n... dan ${skippedCount - 3} data lainnya`] : []),
                        '',
                        skippedCount > 5 ? 'File CSV error telah diunduh otomatis.' : ''
                    ];

                    showModal({
                        type: 'warning',
                        title: 'Import Selesai',
                        message: summaryLines.join('\n')
                    });
                } else {
                    showModal({
                        type: 'success',
                        title: 'Import Berhasil',
                        message: `Berhasil mengimport ${result.total} data siswa.`
                    });
                }
            } else {
                showModal({ type: 'error', title: 'Import Gagal', message: result.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // Fungsi download error report
    const downloadErrorReport = (skipped: any[]) => {
        const csvContent = [
            ['No', 'Baris', 'Nama', 'NIS', 'NISN', 'Alasan Error'].join(','),
            ...skipped.map((d, index) => [
                index + 1,
                d.row,
                `"${d.nama}"`,
                d.nis || '-',
                d.nisn || '-',
                `"${d.reason}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `error_import_siswa_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── filter & pagination ────────────────────────────────────────────────────

    const filteredSiswa = siswaList.filter((siswa) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query ||
            siswa.nama_lengkap?.toLowerCase().includes(query) ||
            siswa.nis?.includes(query) ||
            siswa.nisn?.includes(query) ||
            siswa.tempat_lahir?.toLowerCase().includes(query);

        const matchesGender = !filterValues.jenisKelamin ||
            siswa.jenis_kelamin?.toLowerCase() === filterValues.jenisKelamin.toLowerCase();

        const matchesStatus = !filterValues.status ||
            siswa.status?.toLowerCase() === filterValues.status.toLowerCase();

        return matchesSearch && matchesGender && matchesStatus;
    });

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

    // ── Modal close helpers ────────────────────────────────────────────────────

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
    };

    const closeImport = () => {
        setImportClosing(true);
        setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200);
    };

    // ── FORM PAGE — pola back-button + header card, konsisten dengan
    //    Data Admin & Data Tahun Ajaran ──────────────────────────────────────

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
                        {isEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                        {isEdit ? 'Perbarui informasi data siswa' : 'Isi formulir untuk menambahkan siswa baru'}
                    </p>
                </div>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card header gradient — konsisten dengan Data Admin */}
                <div className="px-6 py-5 flex items-center gap-3" style={HEADER_GRAD}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                            {isEdit ? 'Formulir Edit' : 'Formulir Tambah'}
                        </p>
                        <h2 className="text-base font-bold text-white leading-tight">
                            {isEdit ? 'Ubah Data Siswa' : 'Data Siswa Baru'}
                        </h2>
                    </div>
                </div>

                {/* Form body */}
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Nama Lengkap - PALING ATAS */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Nama Lengkap <span className="text-red-500">*</span></label>
                        <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleInputChange} placeholder="Masukkan nama lengkap"
                            className={errors.nama_lengkap ? inputErrCls : inputCls} />
                        {errors.nama_lengkap && <p className="text-red-500 text-xs">{errors.nama_lengkap}</p>}
                    </div>

                    {/* NIS */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NIS <span className="text-red-500">*</span></label>
                        <input type="text" name="nis" value={formData.nis} onChange={handleInputChange} placeholder="Nomor Induk Siswa"
                            className={errors.nis ? inputErrCls : inputCls} />
                        {errors.nis && <p className="text-red-500 text-xs">{errors.nis}</p>}
                    </div>

                    {/* NISN */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NISN</label>
                        <input type="text" name="nisn" value={formData.nisn} onChange={handleInputChange} placeholder="Nomor Induk Siswa Nasional" className={inputCls} />
                    </div>

                    {/* Tempat Lahir */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tempat Lahir</label>
                        <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange} placeholder="Misal: Jakarta" className={inputCls} />
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tanggal Lahir</label>
                        <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange} className={inputCls} />
                    </div>

                    {/* Jenis Kelamin */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                        <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleInputChange}
                            className={errors.jenis_kelamin ? inputErrCls : inputCls}>
                            <option value="">-- Pilih --</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                        {errors.jenis_kelamin && <p className="text-red-500 text-xs">{errors.jenis_kelamin}</p>}
                    </div>

                    {/* Alamat - Full width */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Alamat</label>
                        <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Masukkan alamat lengkap" rows={2} className={inputCls} />
                    </div>

                    {/* Status - Full width */}
                    <div className="md:col-span-2">
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Status Siswa <span className="text-red-500">*</span></label>
                            <select name="status" value={formData.status} onChange={handleInputChange}
                                className={errors.status ? inputErrCls : inputCls}>
                                <option value="">-- Pilih --</option>
                                <option value="aktif">Aktif</option>
                                <option value="lulus">Lulus</option>
                                <option value="pindah">Pindah</option>
                                <option value="drop-out">Drop Out</option>
                            </select>
                            {errors.status && <p className="text-red-500 text-xs">{errors.status}</p>}
                        </div>
                    </div>

                    {/* Form footer — full width di dalam grid */}
                    <div className="md:col-span-2 flex justify-end gap-3 pt-5 mt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                        <BtnBatal onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }} />
                        <BtnReset onClick={handleReset} />
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

            {/* ✅ TAMBAHAN: Modal Konfirmasi Sederhana */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'} Data
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            {confirmAction === 'add'
                                ? 'Apakah Anda yakin ingin menambahkan data siswa ini?'
                                : 'Apakah Anda yakin ingin mengubah data siswa ini?'}
                        </p>

                        <div className="flex gap-3">
                            <BtnBatal onClick={() => setShowConfirmModal(false)} />
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    if (confirmAction === 'add') {
                                        executeTambah();
                                    } else {
                                        executeEdit();
                                    }
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data siswa</p>
            </div>

            {/* Toolbar card — terpisah dari tabel */}
            <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3" style={CARD_STYLE}>
                {/* Kiri: Tambah */}
                <button onClick={() => setShowTambah(true)}
                    className={btnPrimary.base}
                    style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover}
                    onMouseLeave={btnPrimary.leave}
                >
                    <Plus size={16} /> Tambah Siswa
                </button>

                {/* Kanan: controls */}
                <div className="flex flex-wrap items-center gap-2">

                    {/* Tampilkan N data */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                        <select value={itemsPerPage}
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
                        <input type="text" placeholder="Cari siswa..." value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
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
                        <Filter size={15} /> Filter
                    </button>

                    {/* Import */}
                    <button onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                    >
                        <Upload size={15} /> Import
                    </button>
                </div>
            </div>

            {/* Table card — terpisah dari toolbar */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Info count */}
                <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <p className="text-xs" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'NIS', 'NISN', 'Jenis Kelamin', 'Status', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
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
                            ) : currentSiswa.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Tidak ada data siswa</td></tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id_siswa}
                                    className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                >
                                    <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama_lengkap}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn || '-'}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-700">{formatGender(siswa.jenis_kelamin)}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        {siswa.status === 'aktif' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTIF
                                            </span>
                                        ) : siswa.status === 'lulus' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />LULUS
                                            </span>
                                        ) : siswa.status === 'pindah' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                style={{ background: '#f3f4f5', color: '#6b7280', border: '1px solid #d1d5db' }}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />PINDAH
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />DROP OUT
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleDetail(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                            >
                                                <Eye size={13} /> Detail
                                            </button>
                                            <button onClick={() => handleEdit(siswa)}
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
                            ))}
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

            {/* ── Modal Detail ─────────────────────────────────────────────────── */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Siswa</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{selectedSiswa.nama_lengkap}</h3>
                            </div>

                            <div className="space-y-2.5">
                                {[
                                    {
                                        label: 'Status', value: (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                                style={selectedSiswa.status === 'aktif'
                                                    ? { background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }
                                                    : selectedSiswa.status === 'lulus'
                                                        ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
                                                        : selectedSiswa.status === 'pindah'
                                                            ? { background: '#f3f4f5', color: '#6b7280', border: '1px solid #d1d5db' }
                                                            : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                                                {selectedSiswa.status?.toUpperCase() || 'AKTIF'}
                                            </span>
                                        )
                                    },
                                    { label: 'NIS', value: selectedSiswa.nis },
                                    { label: 'NISN', value: selectedSiswa.nisn || '-' },
                                    { label: 'Jenis Kelamin', value: formatGender(selectedSiswa.jenis_kelamin) },
                                    { label: 'Tempat Lahir', value: selectedSiswa.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedSiswa.tanggal_lahir) },
                                    { label: 'Alamat', value: selectedSiswa.alamat || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2 pb-2.5 items-center" style={{ borderBottom: '1px solid #fde0c8' }}>
                                        <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                                        <span className="text-xs text-gray-700 col-span-1">:</span>
                                        <div className="col-span-2 flex items-center">
                                            <span className="text-xs text-gray-700 break-words">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnNetral onClick={closeDetail}>Tutup</BtnNetral>
                                <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                                    className={btnPrimary.base} style={btnPrimary.style}
                                    onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                                    <Pencil size={14} /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Import ─────────────────────────────────────────────────── */}
            {showImport && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeImport(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-white/80" />
                                <h2 className="text-base font-bold text-white">Import Data Siswa</h2>
                            </div>
                            <button onClick={closeImport} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm mb-3" style={{ color: '#7a3a0a' }}>
                                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
                            </p>
                            <div className="mb-4">
                                <a href="http://localhost:5000/templates/template_import_siswa.xlsx" download
                                    className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: '#e8690a' }}>
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
                                <BtnBatal onClick={closeImport} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Filter ─────────────────────────────────────────────────── */}
            {showFilter && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeFilterModal(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-white/80" />
                                <h2 className="text-base font-bold text-white">Filter Siswa</h2>
                            </div>
                            <button onClick={closeFilterModal} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {[
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua Jenis Kelamin' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'lulus', l: 'Lulus' }, { v: 'pindah', l: 'Pindah' }, { v: 'drop-out', l: 'Drop Out' }] },
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
                                <BtnReset onClick={resetFilter} />
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