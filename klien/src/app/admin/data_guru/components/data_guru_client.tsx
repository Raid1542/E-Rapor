'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Eye, Pencil, Upload, X, Plus, Search, Filter,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    ChevronLeft, Download, RotateCcw, FileSpreadsheet,
    Users, ChevronRight, Phone, MapPin, Calendar, IdCard, Mail,
    User, Award
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 🔧 FIX BARU: Peringatan di console kalau env var belum di-set saat production.
// NEXT_PUBLIC_* di-bake SAAT BUILD, bukan runtime — kalau ini kepanggil dan
// hostname bukan localhost, tapi API_BASE_URL masih localhost:5000, berarti
// env var NEXT_PUBLIC_API_URL belum di-set di server hosting (atau sudah
// di-set tapi project belum di-rebuild ulang setelah itu).
if (typeof window !== 'undefined') {
    const isProdHost = !['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isProdHost && API_BASE_URL.includes('localhost')) {
        // eslint-disable-next-line no-console
        console.warn(
            '[DataGuruClient] NEXT_PUBLIC_API_URL tampaknya belum ter-set di environment hosting ' +
            '(masih fallback ke localhost:5000). Foto profil dan request API tidak akan berfungsi. ' +
            'Set env var NEXT_PUBLIC_API_URL di dashboard hosting lalu REBUILD ulang project.'
        );
    }
}

// ✅ FIX FOTO PROFIL: Helper untuk melengkapi URL foto jika path masih relatif
// (mis. backend mengirim "/uploads/guru/xxx.jpg" bukan URL lengkap)
//
// 🔧 FIX TAMBAHAN: Backend ternyata mengirim field `profileImage` sebagai URL
// LENGKAP yang di-hardcode ke "http://localhost:10000/..." (alamat komputer
// development, bukan server produksi). Kalau URL itu dipakai apa adanya,
// foto hanya bisa tampil di komputer yang backend-nya sedang jalan di
// localhost:10000 — di hosting manapun lain (termasuk Vercel), foto gagal
// dimuat karena browser pengunjung tidak punya server di localhost-nya.
// Solusi: kalau hostname URL foto adalah localhost/127.0.0.1, ambil HANYA
// path filenya lalu sambung ulang dengan API_BASE_URL milik environment
// yang sedang berjalan sekarang (dev tetap localhost, prod otomatis pakai
// domain produksi).
const resolveImageUrl = (path?: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('data:')) return path;

    if (path.startsWith('http://') || path.startsWith('https://')) {
        try {
            const url = new URL(path);
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                // Backend salah hardcode localhost — buang host-nya, pakai API_BASE_URL kita sendiri.
                return `${API_BASE_URL}${url.pathname}`;
            }
            return path; // URL absolut yang valid (bukan localhost), pakai apa adanya.
        } catch {
            return path;
        }
    }

    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

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

const GRID_COLS = 'minmax(56px,0.5fr) minmax(220px,3fr) minmax(110px,1.3fr) minmax(90px,1fr) minmax(90px,1fr) minmax(100px,1.1fr) minmax(180px,1.6fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   SISTEM TOMBOL AKSI
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
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
   HELPERS
   ========================================================================== */

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
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l' || s.includes('laki')) return 'Laki-laki';
    if (s === 'perempuan' || s === 'p' || s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataGuruClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [guruList, setGuruList] = useState<Guru[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    // ✅ FIX FOTO PROFIL: state untuk menandai foto gagal dimuat → fallback ke ikon User
    const [imgError, setImgError] = useState(false);

    const [detailClosing, setDetailClosing] = useState(false);
    const [importClosing, setImportClosing] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [formClosing, setFormClosing] = useState(false);

    const [showFilter, setShowFilter] = useState(false);
    const [filterValues, setFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });
    const [tempFilterValues, setTempFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ------------------------------------------------------------------
       FETCH — DIPERBAIKI: loop mengambil SEMUA halaman dari server,
       bukan cuma satu request tunggal seperti sebelumnya (yang tidak
       pernah kirim page/limit sama sekali, sehingga jumlah data yang
       muncul sepenuhnya tergantung nilai default di backend).

       Ada pengaman: kalau backend TIDAK mendukung page/limit dan selalu
       mengembalikan seluruh data yang sama di setiap request (mengabaikan
       parameter), loop akan otomatis berhenti setelah mendeteksi tidak
       ada data baru — supaya tidak infinite loop atau data terduplikasi.
       Dropdown "Tampilkan X data" (itemsPerPage) tetap hanya mengatur
       jumlah baris per halaman di tabel — logika itu tidak berubah.
    ------------------------------------------------------------------ */

    const fetchGuru = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }

            const PAGE_SIZE = 100; // ukuran per request ke server (bukan batas total data)
            let page = 1;
            let rawList: any[] = [];
            const seenIds = new Set<number>();

            while (true) {
                const res = await fetch(
                    `${API_BASE_URL}/api/admin/guru?page=${page}&limit=${PAGE_SIZE}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();

                if (!res.ok) {
                    showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data guru.' });
                    return;
                }

                const chunk: any[] = Array.isArray(data.data) ? data.data : [];

                // Pengaman anti-infinite-loop / anti-duplikat: kalau backend
                // mengabaikan page/limit dan selalu mengembalikan data yang
                // sama, semua id di chunk halaman ke-2+ pasti sudah pernah
                // dilihat sebelumnya -> berhenti di sini.
                const adaDataBaru = chunk.some(g => !seenIds.has(g.id_user || g.id));
                if (page > 1 && !adaDataBaru) break;

                chunk.forEach(g => seenIds.add(g.id_user || g.id));
                rawList = rawList.concat(chunk);

                if (chunk.length < PAGE_SIZE) break;
                page += 1;
            }

            const validRoles = ['guru_kelas', 'guru_bidang_studi'];
            setGuruList(rawList.map((g: any) => {
                let s = 'aktif';
                if (typeof g.status === 'string') { s = g.status.trim().toLowerCase(); if (s !== 'aktif') s = 'nonaktif'; }
                let roles: string[] = [];
                if (g.roles) { const r = Array.isArray(g.roles) ? g.roles : [g.roles]; roles = r.map((x: any) => String(x).toLowerCase().trim()).filter((x: string) => validRoles.includes(x)); }

                // 🔧 FIX FOTO: field yang benar-benar dipakai backend adalah
                // `foto_path` (path relatif, mis. "/uploads/profil_xxx.jpg")
                // dan `profileImage` (URL lengkap, tapi backend salah
                // hardcode ke "http://localhost:10000/..."). Kita utamakan
                // `foto_path` karena selalu relatif dan aman disambung dengan
                // API_BASE_URL yang benar oleh resolveImageUrl() di manapun
                // aplikasi ini dijalankan (dev maupun produksi). `profileImage`
                // tetap dipakai sebagai fallback (dan localhost di dalamnya
                // otomatis dikoreksi oleh resolveImageUrl()).
                const rawFoto =
                    g.foto_path ?? g.profileImage ?? g.profile_image ??
                    g.foto ?? g.photo ?? g.avatar ?? null;

                return {
                    id: g.id_user || g.id, nama: g.nama_lengkap || g.nama, email: g.email_sekolah || g.email,
                    niy: g.niy, nuptk: g.nuptk, tempat_lahir: g.tempat_lahir || '', tanggal_lahir: g.tanggal_lahir || '',
                    jenisKelamin: g.jenis_kelamin || '', alamat: g.alamat, no_telepon: g.no_telepon || '',
                    statusGuru: s, roles, profileImage: rawFoto,
                };
            }));
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchGuru(); }, [fetchGuru]);

    // ✅ FIX FOTO PROFIL: reset imgError setiap kali membuka detail guru lain
    const handleDetail = (guru: Guru) => {
        setSelectedGuru(guru);
        setImgError(false);
        setShowDetail(true);
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

    const closeForm = () => {
        setFormClosing(true);
        setTimeout(() => {
            setShowTambah(false);
            setShowEdit(false);
            setFormClosing(false);
            handleReset();
        }, 300);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 300);
    };

    const closeImport = () => {
        setImportClosing(true);
        setTimeout(() => { setShowImport(false); setImportClosing(false); }, 300);
    };

    const closeFilterModal = () => {
        setFilterClosing(true);
        setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 300);
    };

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
                formData.niy !== (ori.niy || '') || formData.nuptk !== (ori.nuptk || '') ||
                formData.tempatLahir !== (ori.tempat_lahir || '') ||
                formData.tanggalLahir !== (ori.tanggal_lahir || '') ||
                norm(formData.jenisKelamin) !== norm(ori.jenisKelamin) ||
                formData.alamat !== (ori.alamat || '') ||
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
            const res = await fetch(`${API_BASE_URL}/api/admin/guru`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles, niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon }),
            });
            if (res.ok) {
                closeForm();
                await fetchGuru();
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
            const res = await fetch(`${API_BASE_URL}/api/admin/guru/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles, niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon, status: formData.statusGuru }),
            });
            if (res.ok) {
                closeForm();
                await fetchGuru();
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
        if (!importFile) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' });
            return;
        }
        const fd = new FormData();
        fd.append('file', importFile);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/guru/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd
            });
            const result = await res.json();
            if (res.ok && result.success) {
                closeImport();
                await fetchGuru();
                if (result.skipped && result.skipped.length > 0) {
                    const skippedCount = result.skipped.length;
                    const summaryLines = [
                        `Berhasil: ${result.total} guru`,
                        `Dilewati: ${skippedCount} guru`,
                        '',
                        skippedCount <= 5 ? 'Data yang dilewati:' : `Contoh error (3 dari ${skippedCount}):`,
                        ...result.skipped.slice(0, skippedCount <= 5 ? skippedCount : 3).map((d: any, i: number) => `${i + 1}. Baris ${d.row}: ${d.nama} - ${d.reason}`),
                        ...(skippedCount > 5 ? [`\n... dan ${skippedCount - 3} data lainnya`] : []),
                    ];
                    showModal({ type: 'warning', title: 'Import Selesai', message: summaryLines.join('\n') });
                    if (skippedCount > 5) {
                        const csvContent = [['No', 'Baris', 'Nama', 'Alasan Error'].join(','), ...result.skipped.map((d: any, index: number) => [index + 1, d.row, `"${d.nama}"`, `"${d.reason}"`].join(','))].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.setAttribute('href', URL.createObjectURL(blob));
                        link.setAttribute('download', `error_import_guru_${new Date().toISOString().split('T')[0]}.csv`);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                } else {
                    showModal({ type: 'success', title: 'Import Berhasil', message: `Berhasil mengimport ${result.total} data guru.` });
                }
            } else {
                showModal({ type: 'error', title: 'Import Gagal', message: result.message || 'Terjadi kesalahan saat mengimpor data guru.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

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
    const endIndex = startIndex + itemsPerPage;
    const currentGuru = filteredGuru.slice(startIndex, endIndex);
    const activeFilterCount = Object.values(filterValues).filter(Boolean).length;

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

    const resetFilter = () => { const e = { role: '', jenisKelamin: '', status: '' }; setFilterValues(e); setTempFilterValues(e); };
    const openFilterModal = () => { setTempFilterValues(filterValues); setShowFilter(true); };
    const applyFilter = () => { setFilterValues(tempFilterValues); setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 300); };

    const renderForm = (isEdit: boolean) => (
        <div className={`flex-1 min-h-screen p-3 sm:p-6 transition-all duration-300 ${formClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`} style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-3xl mx-auto">
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
                            {isEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}
                        </h1>
                        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
                            {isEdit ? 'Perbarui informasi data guru' : 'Isi formulir untuk menambahkan guru baru'}
                        </p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white">{isEdit ? 'Ubah Data Guru' : 'Data Guru Baru'}</h2>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className={labelCls} style={labelColor}>Nama Lengkap <span className="text-red-500">*</span></label>
                                <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama ? inputErrCls : inputCls} />
                                {errors.nama && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Email Sekolah <span className="text-red-500">*</span></label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contoh@sekolah.sch.id" className={errors.email ? inputErrCls : inputCls} />
                                {errors.email && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.email}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tempat Lahir <span className="text-red-500">*</span></label>
                                <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Kota/Kabupaten" className={errors.tempatLahir ? inputErrCls : inputCls} />
                                {errors.tempatLahir && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.tempatLahir}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
                                <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={errors.tanggalLahir ? inputErrCls : inputCls} />
                                {errors.tanggalLahir && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.tanggalLahir}</p>}
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
                                    <label className={labelCls} style={labelColor}>Status Guru <span className="text-red-500">*</span></label>
                                    <select name="statusGuru" value={formData.statusGuru} onChange={handleInputChange} className={errors.statusGuru ? inputErrCls : inputCls}>
                                        <option value="">-- Pilih --</option>
                                        <option value="aktif">Aktif</option>
                                        <option value="nonaktif">Nonaktif</option>
                                    </select>
                                    {errors.statusGuru && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.statusGuru}</p>}
                                </div>
                            )}

                            <div className="sm:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={3} className={inputCls} />
                            </div>

                            <div className="sm:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Role (Hak Akses) <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                    {[{ key: 'guru_kelas', label: 'Guru Kelas' }, { key: 'guru_bidang_studi', label: 'Guru Bidang Studi' }].map(role => {
                                        const active = formData.roles.includes(role.key);
                                        return (
                                            <button key={role.key} type="button"
                                                onClick={() => { setFormData(p => ({ ...p, roles: p.roles.includes(role.key) ? p.roles.filter(r => r !== role.key) : [...p.roles, role.key] })); setErrors(p => ({ ...p, roles: '' })); }}
                                                className="btn-action px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border-2"
                                                style={active
                                                    ? { background: BRAND_GRADIENT, color: '#fff', borderColor: ACCENT_DARK, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }
                                                    : { background: '#fff', color: '#7a3a0a', borderColor: '#f0e0d0' }}
                                            >
                                                {role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.roles && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.roles}</p>}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={closeForm}>
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
                            {confirmAction === 'add' ? 'Apakah Anda yakin ingin menambahkan data guru ini?' : 'Apakah Anda yakin ingin menyimpan perubahan data guru ini?'}
                        </p>
                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmModal(false); confirmAction === 'add' ? executeTambah() : executeEdit(); }}>
                                {confirmAction === 'add' ? 'Tambahkan' : 'Simpan'}
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Guru</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data guru dan hak akses</p>
            </div>

            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-shrink-0">
                        <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                            <Plus size={16} /> <span className="hidden sm:inline">Tambah Guru</span><span className="sm:hidden">Tambah</span>
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

                        <ActionButton variant="accent" onClick={openFilterModal}>
                            <Filter size={15} /> <span className="hidden sm:inline">Filter</span>{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                        </ActionButton>
                        <ActionButton variant="info" onClick={() => setShowImport(true)}>
                            <Upload size={15} /> <span className="hidden sm:inline">Import</span>
                        </ActionButton>
                    </div>
                </div>
            </div>

            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '850px' }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Kelamin</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIY</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NUPTK</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Status</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                        </div>

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
                        ) : currentGuru.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">Tidak ada data guru</p>
                                    {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                </div>
                            </div>
                        ) : currentGuru.map((guru, index) => (
                            <div key={guru.id} className="grid row-in row-hover border-b transition-colors"
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
                                    <p className="font-bold text-gray-900 truncate" title={guru.nama}>{guru.nama}</p>
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 whitespace-nowrap">{formatGender(guru.jenisKelamin)}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{guru.niy || '-'}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{guru.nuptk || '-'}</div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    {guru.statusGuru === 'aktif' ? (
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
                                        <ActionButton size="sm" variant="info" onClick={() => handleDetail(guru)} title="Lihat detail">
                                            <Eye size={13} /> Detail
                                        </ActionButton>
                                        <ActionButton size="sm" variant="warning" onClick={() => handleEdit(guru)} title="Edit data">
                                            <Pencil size={13} /> Edit
                                        </ActionButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                    <span className="text-xs font-medium text-gray-500">
                        {filteredGuru.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredGuru.length)} dari {filteredGuru.length} data
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

            {showDetail && selectedGuru && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${detailClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${detailClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeDetail} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 overflow-hidden ${detailClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <h2 className="text-lg sm:text-xl font-bold text-white">Detail Data Guru</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    {/* ✅ FIX FOTO PROFIL: URL foto dilengkapi via resolveImageUrl() dan
                                        fallback ke ikon User (bukan lingkaran kosong) memakai state imgError */}
                                    <div
                                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4 overflow-hidden"
                                        style={{
                                            background: selectedGuru.profileImage && !imgError ? '#fff' : 'linear-gradient(135deg, #fed7aa, #fde0c8)',
                                            borderColor: '#fde0c8',
                                        }}
                                    >
                                        {selectedGuru.profileImage && !imgError ? (
                                            <img
                                                src={resolveImageUrl(selectedGuru.profileImage)}
                                                alt={selectedGuru.nama}
                                                className="w-full h-full rounded-full object-cover"
                                                onError={() => setImgError(true)}
                                            />
                                        ) : (
                                            <User size={48} style={{ color: '#c2410c' }} />
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2" style={{ background: selectedGuru.statusGuru === 'aktif' ? '#22c55e' : '#6b7280', borderColor: '#fff' }}>
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: '#fde0c8' }}>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: selectedGuru.statusGuru === 'aktif' ? '#dcfce7' : '#f3f4f6', color: selectedGuru.statusGuru === 'aktif' ? '#166534' : '#4b5563', border: `1px solid ${selectedGuru.statusGuru === 'aktif' ? '#86efac' : '#d1d5db'}` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: selectedGuru.statusGuru === 'aktif' ? '#22c55e' : '#6b7280' }} />
                                    {selectedGuru.statusGuru === 'aktif' ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <span className="text-sm text-gray-600 font-semibold">Role:</span>
                                <div className="flex gap-2">
                                    {selectedGuru.roles?.includes('guru_bidang_studi') && (<span className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: '#fdf2f8', color: '#9d174d', border: '1px solid #fbcfe8' }}>Guru Bid. Studi</span>)}
                                    {selectedGuru.roles?.includes('guru_kelas') && (<span className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>Guru Kelas</span>)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><User size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Nama Lengkap</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedGuru.nama}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Mail size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Email Sekolah</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 break-all">{selectedGuru.email || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NIY</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedGuru.niy || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Award size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NUPTK</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedGuru.nuptk || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Users size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Jenis Kelamin</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{formatGender(selectedGuru.jenisKelamin)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Phone size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>No. Telepon</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedGuru.no_telepon || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Calendar size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Tempat, Tanggal Lahir</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedGuru.tempat_lahir || '-'}, {formatTanggalIndonesia(selectedGuru.tanggal_lahir)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><MapPin size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Alamat</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedGuru.alamat || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={closeDetail}>Tutup</ActionButton>
                            <ActionButton variant="warning" onClick={() => { handleEdit(selectedGuru); closeDetail(); }}>
                                <Pencil size={16} /> Edit Data
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${importClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${importClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeImport} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${importClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Upload size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Data Massal</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Import Data Guru</h2>
                                </div>
                            </div>
                            <button onClick={closeImport} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                                <FileSpreadsheet size={19} className="mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>Format file: <strong>.xlsx</strong> atau <strong>.xls</strong></p>
                                    <a href={`${API_BASE_URL}/templates/template_import_guru.xlsx`} download className="text-sm font-bold flex items-center gap-1.5 hover:underline mt-1.5" style={{ color: ACCENT }}>
                                        <Download size={13} /> Unduh template Excel
                                    </a>
                                </div>
                            </div>
                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors" style={{ border: '2px dashed #e5e5e5', background: '#fafafa' }} onMouseEnter={e => (e.currentTarget.style.background = '#fff5eb')} onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
                                <Upload className="w-7 h-7 mb-2" style={{ color: ACCENT }} />
                                <p className="text-sm">
                                    {importFile ? <span className="font-bold" style={{ color: ACCENT_DARK }}>{importFile.name}</span> : <span className="text-gray-400 font-medium">Klik untuk pilih file</span>}
                                </p>
                                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>
                            <div className="flex gap-2.5 mt-5">
                                <ActionButton variant="neutral" fullWidth onClick={closeImport}>Batal</ActionButton>
                                <ActionButton variant="primary" fullWidth disabled={!importFile} onClick={handleImportExcel}>
                                    <Upload size={15} /> Import Sekarang
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFilter && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${filterClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${filterClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeFilterModal} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-300 ${filterClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Filter size={15} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Penyaringan Data</p>
                                    <h2 className="text-sm font-bold text-white leading-tight truncate">Filter Guru</h2>
                                </div>
                            </div>
                            <button onClick={closeFilterModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3.5">
                            {[
                                { label: 'Role', name: 'role', options: [{ v: '', l: 'Semua Role' }, { v: 'guru_kelas', l: 'Guru Kelas' }, { v: 'guru_bidang_studi', l: 'Guru Bidang Studi' }] },
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }] },
                            ].map(f => (
                                <div key={f.name} className="flex flex-col gap-1">
                                    <label className={labelCls} style={labelColor}>{f.label}</label>
                                    <select value={(tempFilterValues as any)[f.name]} onChange={e => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))} className={inputCls}>
                                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div className="pt-2 flex gap-2.5 border-t" style={{ borderColor: '#f0f0f0' }}>
                                <ActionButton variant="neutral" onClick={resetFilter}>
                                    <RotateCcw size={14} /> Reset
                                </ActionButton>
                                <ActionButton variant="primary" fullWidth onClick={applyFilter}>
                                    Terapkan Filter
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}