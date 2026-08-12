/**
 * Nama File: data_mata_pelajaran_client.tsx
 * Fungsi: Komponen utama halaman Data Mata Pelajaran untuk admin.
 *         Menyediakan fitur CRUD mata pelajaran per SEMESTER
 *         (bukan per tahun ajaran induk).
 * Update: Menyamakan tampilan (warna, bentuk tombol, tabel grid, animasi) dengan
 *         data_guru_client.tsx / data_pembina_ekskul_client.tsx / data_kelas_client.tsx /
 *         data_tahun_ajaran_client.tsx / data_sekolah_client.tsx / siswa_per_kelas_client.tsx.
 *         Notifikasi & konfirmasi dirapikan jadi satu sistem modal yang konsisten.
 *         Hanya lapisan UI yang diubah — semua logika, state, dan pemanggilan API
 *         tetap sama persis seperti sebelumnya.
 */

'use client';
import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    Lock, CalendarRange, ChevronLeft, ChevronRight, RotateCcw, BookOpen,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface MataPelajaran {
    id: number;
    kode_mapel: string;
    nama_mapel: string;
    jenis: string;
    kurikulum: string;
    tahun_ajaran_id: number;
    tahun_ajaran: string;
    semester: string;
    urutan_rapor: number | null;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    is_aktif: boolean;
}

interface SemesterOption {
    id: number;
    semester: string;
    is_aktif: boolean;
}

interface FormDataType {
    kode_mapel: string;
    nama_mapel: string;
    jenis: string;
    kurikulum: string;
    urutan_rapor: string;
}

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const GRID_COLS = 'minmax(50px,0.5fr) minmax(90px,0.9fr) minmax(180px,2fr) minmax(90px,0.9fr) minmax(140px,1.3fr) minmax(100px,0.9fr) minmax(170px,1.6fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

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

// ─── SISTEM TOMBOL AKSI ────────────────────────────────────────────────────

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
    onClick, children, variant = 'neutral', size = 'md', disabled = false, fullWidth = false, title,
}: {
    onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
    disabled?: boolean; fullWidth?: boolean; title?: string;
}) => {
    const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
    return (
        <button
            type="button"
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

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

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

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataMataPelajaranPage() {
    const { showSessionExpired, handleLogout } = useSession();
    const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
    const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
    const [isSemesterActive, setIsSemesterActive] = useState<boolean>(false);

    const [formClosing, setFormClosing] = useState(false);

    const [formData, setFormData] = useState<FormDataType>({
        kode_mapel: '', nama_mapel: '', jenis: '', kurikulum: '', urutan_rapor: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const initialFormDataRef = useRef<FormDataType | null>(null);

    // ── Fetch Functions ────────────────────────────────────────────────────────

    const fetchTahunAjaranList = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const uniqueTA = Array.from(
                    new Map(data.data.map((item: any) => [item.id_induk, {
                        id: item.id_induk,
                        tahun_ajaran: item.tahun_ajaran,
                        is_aktif: item.status === 'AKTIF'
                    }])).values()
                );

                setTahunAjaranList(uniqueTA);

                const savedTA = localStorage.getItem('selectedTahunAjaranId_mapel');
                if (savedTA) {
                    const savedId = Number(savedTA);
                    setSelectedTahunAjaranId(savedId);
                    fetchSemesterByTahunAjaran(savedId);
                }
            }
        } catch (err) {
            console.error('Error fetch tahun ajaran:', err);
        }
    };

    const fetchSemesterByTahunAjaran = async (idInduk: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // ✅ PERUBAHAN 3: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/semester-list`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const semesters = data.data
                    .filter((sem: any) => sem.id_induk === idInduk)
                    .map((sem: any) => ({
                        id: sem.id,
                        semester: sem.semester,
                        is_aktif: sem.is_aktif
                    }));

                setSemesterOptions(semesters);

                const savedSemester = localStorage.getItem('selectedSemesterId_mapel');
                if (savedSemester) {
                    const savedId = Number(savedSemester);
                    const sem = semesters.find(s => s.id === savedId);
                    if (sem) {
                        setSelectedSemesterId(savedId);
                        setIsSemesterActive(sem.is_aktif);
                        setLoading(true);
                        fetchMataPelajaran(savedId);
                        return;
                    }
                }

                setSelectedSemesterId(null);
                setIsSemesterActive(false);
                setMapelList([]);
            }
        } catch (err) {
            console.error('Error fetch semester:', err);
        }
    };

    const fetchMataPelajaran = async (semesterId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }
            // ✅ PERUBAHAN 4: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/mata-pelajaran?tahun_ajaran_id=${semesterId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                const mapped = (Array.isArray(data.data) ? data.data : []).map((mp: any) => ({
                    id: mp.id_mata_pelajaran,
                    kode_mapel: mp.kode_mapel,
                    nama_mapel: mp.nama_mapel,
                    jenis: mp.jenis,
                    kurikulum: mp.kurikulum,
                    tahun_ajaran_id: mp.tahun_ajaran_id,
                    tahun_ajaran: mp.tahun_ajaran,
                    semester: mp.semester,
                    urutan_rapor: mp.urutan_rapor
                }));
                setMapelList(mapped);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTahunAjaranList();
    }, []);

    useEffect(() => {
        if (selectedTahunAjaranId) {
            fetchSemesterByTahunAjaran(selectedTahunAjaranId);
        }
    }, [selectedTahunAjaranId]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (name === 'jenis') {
            setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
        }
        else if (name === 'kode_mapel') {
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
        }
        else if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = (): boolean => {
        const ne: Record<string, string> = {};
        const kodeMapel = formData.kode_mapel?.trim().toUpperCase() || '';
        const namaMapel = formData.nama_mapel?.trim() || '';
        const kurikulum = formData.kurikulum?.trim() || '';
        const jenis = formData.jenis?.toLowerCase().trim() || '';

        if (!kodeMapel) ne.kode_mapel = 'Kode mapel wajib diisi';
        if (!namaMapel) ne.nama_mapel = 'Nama mapel wajib diisi';
        if (!kurikulum) ne.kurikulum = 'Kurikulum wajib diisi';
        if (!jenis) {
            ne.jenis = 'Jenis mapel wajib dipilih';
        } else if (!['wajib', 'pilihan'].includes(jenis)) {
            ne.jenis = `Jenis tidak valid: "${jenis}"`;
        }
        if (kodeMapel && !/^[A-Z0-9-]{2,20}$/.test(kodeMapel)) {
            ne.kode_mapel = 'Kode mapel harus 2-20 karakter, A-Z, 0-9, -';
        }
        if (namaMapel && namaMapel.length < 3) {
            ne.nama_mapel = 'Nama minimal 3 karakter';
        }
        if (formData.urutan_rapor && formData.urutan_rapor.trim() !== '') {
            const urutan = Number(formData.urutan_rapor.trim());
            if (isNaN(urutan) || !Number.isInteger(urutan)) {
                ne.urutan_rapor = 'Urutan rapor harus bilangan bulat';
            } else if (urutan < 1 || urutan > 100) {
                ne.urutan_rapor = 'Urutan rapor 1-100';
            }
        }

        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
            return false;
        }
        return true;
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (!validate()) return;

        if (action === 'edit' && initialFormDataRef.current) {
            const initial = initialFormDataRef.current;
            const hasChanges =
                formData.kode_mapel !== initial.kode_mapel ||
                formData.nama_mapel !== initial.nama_mapel ||
                formData.jenis !== initial.jenis ||
                formData.kurikulum !== initial.kurikulum ||
                formData.urutan_rapor !== initial.urutan_rapor;

            if (!hasChanges) {
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
                return;
            }
        }

        showModal({
            type: 'confirm',
            title: `Konfirmasi ${action === 'add' ? 'Penambahan' : 'Perubahan'} Data`,
            message: action === 'add' ? 'Apakah Anda yakin ingin menambahkan mata pelajaran ini?' : 'Apakah Anda yakin ingin mengubah data mata pelajaran ini?',
            onConfirm: () => { action === 'add' ? executeTambah() : executeEdit(); },
        });
    };

    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }
        if (!selectedSemesterId) {
            showModal({ type: 'warning', title: 'Semester Belum Dipilih', message: 'Pilih semester terlebih dahulu.' });
            return;
        }

        try {
            const payload = {
                kode_mapel: formData.kode_mapel.trim().toUpperCase(),
                nama_mapel: formData.nama_mapel.trim(),
                jenis: formData.jenis.trim(),
                kurikulum: formData.kurikulum.trim(),
                semester_id: selectedSemesterId
            };

            // ✅ PERUBAHAN 5: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/mata-pelajaran`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeForm();
                await fetchMataPelajaran(selectedSemesterId);
                showModal({
                    type: 'success',
                    title: 'Berhasil Ditambahkan!',
                    message: `Mata pelajaran ${formData.nama_mapel} berhasil ditambahkan.`
                });
            } else {
                const err = await res.json();
                showModal({
                    type: 'error',
                    title: 'Gagal Menambahkan',
                    message: err.message || 'Terjadi kesalahan.'
                });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
        if (!editId) return;

        try {
            const urutan_rapor = formData.urutan_rapor.trim() ? Number(formData.urutan_rapor.trim()) : null;
            const payload = {
                kode_mapel: formData.kode_mapel.trim().toUpperCase(),
                nama_mapel: formData.nama_mapel.trim(),
                jenis: formData.jenis.trim(),
                kurikulum: formData.kurikulum.trim(),
                urutan_rapor
            };
            // ✅ PERUBAHAN 6: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/mata-pelajaran/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeForm();
                setEditId(null);
                if (selectedSemesterId) await fetchMataPelajaran(selectedSemesterId);
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Mata pelajaran ${formData.nama_mapel} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleEdit = (mapel: MataPelajaran) => {
        const initialData: FormDataType = {
            kode_mapel: mapel.kode_mapel.toUpperCase(),
            nama_mapel: mapel.nama_mapel,
            jenis: mapel.jenis.toLowerCase(),
            kurikulum: mapel.kurikulum,
            urutan_rapor: mapel.urutan_rapor !== null ? String(mapel.urutan_rapor) : ''
        };
        setEditId(mapel.id);
        setFormData(initialData);
        initialFormDataRef.current = { ...initialData };
        setShowEdit(true);
    };

    const handleDelete = (id: number, namaMapel: string) => {
        showModal({
            type: 'confirm',
            title: 'Konfirmasi Hapus',
            message: `Apakah Anda yakin ingin menghapus "${namaMapel}"? Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                    // ✅ PERUBAHAN 7: URL sekarang pakai API_BASE_URL
                    const res = await fetch(`${API_BASE_URL}/api/admin/mata-pelajaran/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        if (selectedSemesterId) await fetchMataPelajaran(selectedSemesterId);
                        showModal({ type: 'success', title: 'Berhasil Dihapus!', message: `"${namaMapel}" berhasil dihapus.` });
                    } else {
                        const err = await res.json();
                        showModal({ type: 'error', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan.' });
                    }
                } catch {
                    showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
                }
            }
        });
    };

    const handleReset = () => {
        setFormData({ kode_mapel: '', nama_mapel: '', jenis: '', kurikulum: '', urutan_rapor: '' });
        setErrors({});
    };

    const closeForm = () => {
        setFormClosing(true);
        setTimeout(() => {
            setShowTambah(false);
            setShowEdit(false);
            setFormClosing(false);
            handleReset();
        }, 300);
    };

    const filteredMapel = mapelList.filter((mp) => {
        const query = searchQuery.toLowerCase().trim();
        return !query ||
            mp.kode_mapel.toLowerCase().includes(query) ||
            mp.nama_mapel.toLowerCase().includes(query) ||
            mp.jenis.toLowerCase().includes(query) ||
            mp.kurikulum.toLowerCase().includes(query);
    });

    const totalPages = Math.max(1, Math.ceil(filteredMapel.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMapel = filteredMapel.slice(startIndex, endIndex);

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
        range.forEach((p) => {
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
            else {
                pages.push(
                    <button key={p} onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
                    >{p}</button>
                );
            }
        });
        return pages;
    };

    const renderForm = (isEdit: boolean) => (
        <div className={`flex-1 min-h-screen p-3 sm:p-6 transition-all duration-300 ${formClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`} style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-2xl mx-auto">
                <div className="mb-4 sm:mb-5 flex items-center gap-3 anim-in d1">
                    <button
                        onClick={closeForm}
                        aria-label="Kembali"
                        className="btn-action w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2"
                        style={{ background: '#fff', borderColor: '#f0e0d0', color: ACCENT_DARK }}
                    >
                        <ChevronLeft size={19} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                            {isEdit ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
                        </h1>
                        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
                            {isEdit ? 'Perbarui informasi mata pelajaran' : 'Isi formulir untuk menambahkan mata pelajaran baru'}
                        </p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white">{isEdit ? 'Ubah Data Mata Pelajaran' : 'Data Mata Pelajaran Baru'}</h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Kode Mapel <span className="text-red-500">*</span></label>
                                <input
                                    type="text" name="kode_mapel" value={formData.kode_mapel}
                                    onChange={handleInputChange} placeholder="Contoh: MAT, BINDO"
                                    maxLength={20}
                                    className={errors.kode_mapel ? inputErrCls : inputCls}
                                />
                                {errors.kode_mapel && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.kode_mapel}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Nama Mata Pelajaran <span className="text-red-500">*</span></label>
                                <input
                                    type="text" name="nama_mapel" value={formData.nama_mapel}
                                    onChange={handleInputChange} placeholder="Contoh: Matematika"
                                    className={errors.nama_mapel ? inputErrCls : inputCls}
                                />
                                {errors.nama_mapel && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama_mapel}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Jenis <span className="text-red-500">*</span></label>
                                <select name="jenis" value={formData.jenis} onChange={handleInputChange}
                                    className={errors.jenis ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="wajib">Wajib</option>
                                    <option value="pilihan">Pilihan</option>
                                </select>
                                {errors.jenis && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.jenis}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Kurikulum <span className="text-red-500">*</span></label>
                                <input
                                    type="text" name="kurikulum" value={formData.kurikulum}
                                    onChange={handleInputChange} placeholder="Contoh: Kurikulum Merdeka"
                                    className={errors.kurikulum ? inputErrCls : inputCls}
                                />
                                {errors.kurikulum && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.kurikulum}</p>}
                            </div>

                            {isEdit && (
                                <div className="sm:col-span-2 flex flex-col gap-1">
                                    <label className={labelCls} style={labelColor}>Urutan di Rapor</label>
                                    <input
                                        type="number" name="urutan_rapor" value={formData.urutan_rapor}
                                        onChange={handleInputChange} placeholder="Contoh: 1, 2, 3..."
                                        min="1" max="100"
                                        className={errors.urutan_rapor ? inputErrCls : inputCls}
                                        style={{ maxWidth: '200px' }}
                                    />
                                    {errors.urutan_rapor && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.urutan_rapor}</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={closeForm}>Batal</ActionButton>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Mata Pelajaran</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data mata pelajaran per semester</p>
            </div>

            <div className="card-flat bg-white rounded-2xl px-4 sm:px-5 py-3.5 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 anim-in d2" style={CARD_STYLE}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                        <CalendarRange size={16} style={{ color: ACCENT_DARK }} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>Tahun Ajaran</label>
                        <select
                            value={selectedTahunAjaranId ?? ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === 'no-data') {
                                    setSelectedTahunAjaranId(null);
                                    setSelectedSemesterId(null);
                                    setIsSemesterActive(false);
                                    setSemesterOptions([]);
                                    setMapelList([]);
                                    setLoading(false);
                                    localStorage.removeItem('selectedTahunAjaranId_mapel');
                                    localStorage.removeItem('selectedSemesterId_mapel');
                                    return;
                                }
                                const id = Number(value);
                                setSelectedTahunAjaranId(id);
                                setSelectedSemesterId(null);
                                setIsSemesterActive(false);
                                setMapelList([]);
                                localStorage.setItem('selectedTahunAjaranId_mapel', id.toString());
                                localStorage.removeItem('selectedSemesterId_mapel');
                                setLoading(true);
                                fetchSemesterByTahunAjaran(id);
                            }}
                            className="border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200 min-w-[200px]"
                        >
                            <option value="">-- Pilih Tahun Ajaran --</option>
                            {tahunAjaranList.map(ta => (
                                <option key={ta.id} value={ta.id}>{ta.tahun_ajaran} {ta.is_aktif ? '(Aktif)' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedTahunAjaranId !== null && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>Semester</label>
                        <select
                            value={selectedSemesterId ?? ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === 'no-data') {
                                    setSelectedSemesterId(null);
                                    setIsSemesterActive(false);
                                    setMapelList([]);
                                    localStorage.removeItem('selectedSemesterId_mapel');
                                    return;
                                }
                                const id = Number(value);
                                const selectedSem = semesterOptions.find(s => s.id === id);
                                setSelectedSemesterId(id);
                                setIsSemesterActive(selectedSem?.is_aktif || false);
                                localStorage.setItem('selectedSemesterId_mapel', id.toString());
                                setLoading(true);
                                fetchMataPelajaran(id);
                            }}
                            className="border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200 min-w-[190px]"
                        >
                            <option value="">-- Pilih Semester --</option>
                            {semesterOptions.map(sem => (
                                <option key={sem.id} value={sem.id}>{sem.semester} {sem.is_aktif ? '(Aktif)' : ''}</option>
                            ))}
                        </select>

                        {selectedSemesterId && (
                            isSemesterActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-green-50 text-green-700 border border-green-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Aktif
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-500 border border-gray-200">
                                    <Lock size={11} /> Nonaktif
                                </span>
                            )
                        )}
                    </div>
                )}
            </div>

            {selectedTahunAjaranId === null ? (
                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                    <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                        <CalendarRange size={30} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-500">Pilih Tahun Ajaran Terlebih Dahulu</p>
                    </div>
                </div>
            ) : selectedSemesterId === null ? (
                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                    <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                        <BookOpen size={30} className="text-gray-300" />
                        <p className="text-sm font-bold text-gray-500">Pilih Semester Terlebih Dahulu</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d3" style={CARD_STYLE}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div className="flex-shrink-0">
                                {isSemesterActive ? (
                                    <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                                        <Plus size={16} /> <span className="hidden sm:inline">Tambah Mapel</span><span className="sm:hidden">Tambah</span>
                                    </ActionButton>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Semester ini tidak aktif</span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                                <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                                    </div>
                                    <input type="text" placeholder="Cari mata pelajaran..." value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400" />
                                    {searchQuery && (
                                        <button type="button" aria-label="Bersihkan pencarian" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                            className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                                    <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                                    <select value={itemsPerPage}
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200">
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

                    <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
                        <div className="overflow-x-auto">
                            <div style={{ width: '100%', minWidth: '820px' }}>
                                <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Kode</div>
                                    <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Mata Pelajaran</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Jenis</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Kurikulum</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Urutan</div>
                                    <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                                </div>

                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                            {Array.from({ length: 7 }).map((__, j) => (
                                                <div key={j} className="px-4 py-4 flex items-center justify-center">
                                                    <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 2 ? '85%' : '55%' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : currentMapel.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {!isSemesterActive ? (
                                                <>
                                                    <Lock size={30} className="text-gray-300" />
                                                    <p className="text-sm font-semibold text-gray-500">Semester ini tidak aktif. Belum ada data mata pelajaran.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <BookOpen size={30} className="text-gray-300" />
                                                    <p className="text-sm font-semibold text-gray-500">Tidak ada data mata pelajaran</p>
                                                    {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : currentMapel.map((mp, index) => (
                                    <div key={mp.id} className="grid row-in row-hover border-b transition-colors"
                                        style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0', background: '#fff', animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>
                                        <div className="px-4 py-4 flex items-center justify-center text-center font-bold" style={{ color: ACCENT_DARK }}>{mp.kode_mapel}</div>
                                        <div className="px-4 py-4 flex items-center overflow-hidden">
                                            <p className="font-bold text-gray-900 truncate" title={mp.nama_mapel}>{mp.nama_mapel}</p>
                                        </div>
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {mp.jenis === 'wajib' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>Wajib</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap bg-green-50 text-green-700 border border-green-200">Pilihan</span>
                                            )}
                                        </div>
                                        <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 truncate">{mp.kurikulum}</div>
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {mp.urutan_rapor !== null ? (
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                                                    {mp.urutan_rapor}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </div>
                                        <div className="px-4 py-4 flex items-center justify-center">
                                            {isSemesterActive ? (
                                                <div className="flex justify-center gap-1.5">
                                                    <ActionButton size="sm" variant="warning" onClick={() => handleEdit(mp)} title="Edit data">
                                                        <Pencil size={13} /> Edit
                                                    </ActionButton>
                                                    <ActionButton size="sm" variant="danger" onClick={() => handleDelete(mp.id, mp.nama_mapel)} title="Hapus mata pelajaran">
                                                        <Trash2 size={13} /> Hapus
                                                    </ActionButton>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }} title="Data terkunci karena semester tidak aktif">
                                                    <Lock size={11} /> Terkunci
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                            <span className="text-xs font-medium text-gray-500">
                                {filteredMapel.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredMapel.length)} dari {filteredMapel.length} data
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
                </>
            )}
        </div>
    );
}