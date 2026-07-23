/**
 * Nama File: profil_client.tsx
 * Fungsi: Komponen client-side untuk manajemen profil pengguna admin.
 *         Memungkinkan pengeditan data pribadi (nama, NUPTK, alamat, dsb.)
 *         dan pengunggahan foto profil.
 *         Data profil disinkronkan antara localStorage dan API backend.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Update: Menyamakan tampilan (warna, bentuk tombol, kartu, modal) dengan
 *         seluruh halaman admin lainnya (data_guru_client.tsx, data_kelas_client.tsx,
 *         data_tahun_ajaran_client.tsx, data_sekolah_client.tsx, dst). Hanya lapisan
 *         UI yang diubah — semua logika, state, dan pemanggilan API tetap sama persis.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Lock, Upload, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface UserProfile {
    id: number;
    role: string;
    nama_lengkap: string;
    email_sekolah: string;
    roles: string[];
    niy?: string;
    nuptk?: string;
    jenis_kelamin?: string;
    alamat?: string;
    no_telepon?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string | null;
    profileImage?: string;
}

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
// Disamakan dengan seluruh halaman admin lainnya.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";
const readonlyCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-500 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0);   }
        }
        .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.02s; }
        .d2 { animation-delay: 0.06s; }
        .d3 { animation-delay: 0.10s; }

        .card-flat { transition: box-shadow 0.2s ease; }
        .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .btn-action, .card-flat {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

// ─── SISTEM TOMBOL AKSI ────────────────────────────────────────────────────

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
    onClick, children, variant = 'neutral', disabled = false, fullWidth = false, type = 'button',
}: {
    onClick?: () => void; children: React.ReactNode; variant?: BtnVariant;
    disabled?: boolean; fullWidth?: boolean; type?: 'button' | 'submit';
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn-action inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap px-5 py-2.5 text-sm ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={VARIANT_BASE[variant]}
    >
        {children}
    </button>
);

// ─── NOTIF MODAL (satu sistem untuk notifikasi & konfirmasi) ─────────────────

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
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                        {s.icon}
                    </div>
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
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                            OK, Mengerti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ProfilePage = () => {
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

    const [formData, setFormData] = useState({
        nama: '', nuptk: '', niy: '', jenisKelamin: 'Laki-laki',
        telepon: '', email: '', alamat: '', tempatLahir: '', tanggalLahir: ''
    });

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // State untuk modal konfirmasi
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Simpan data awal untuk mendeteksi perubahan
    const initialFormDataRef = useRef<typeof formData | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── Fetch profil ───────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('currentUser');

            if (!token || !storedUser) {
                window.location.href = '/login';
                return;
            }

            try {
                const userData: UserProfile = JSON.parse(storedUser);
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

                const res = await fetch(`http://localhost:5000/api/admin/admin/${userData.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                let freshData = userData;

                if (res.ok) {
                    const apiResponse = await res.json();
                    freshData = apiResponse.data;

                    const updatedUser = {
                        ...userData,
                        nama_lengkap: freshData.nama || userData.nama_lengkap,
                        email_sekolah: freshData.email || userData.email_sekolah,
                        niy: freshData.niy || '',
                        nuptk: freshData.nuptk || '',
                        tempat_lahir: freshData.tempat_lahir || '',
                        tanggal_lahir: freshData.tanggal_lahir || null,
                        jenis_kelamin: freshData.jenis_kelamin || 'Laki-laki',
                        alamat: freshData.alamat || '',
                        no_telepon: freshData.no_telepon || '',
                        profileImage: freshData.profileImage || null,
                    };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                }

                if (freshData.profileImage && freshData.profileImage.trim()) {
                    setProfileImage(`${baseUrl}${freshData.profileImage}`);
                } else {
                    setProfileImage(null);
                }

                const loadedData = {
                    nama: freshData.nama || freshData.nama_lengkap || '',
                    nuptk: freshData.nuptk || '',
                    niy: freshData.niy || '',
                    jenisKelamin: freshData.jenis_kelamin || 'Laki-laki',
                    telepon: freshData.no_telepon || '',
                    email: freshData.email || freshData.email_sekolah || '',
                    alamat: freshData.alamat || '',
                    tempatLahir: freshData.tempat_lahir || '',
                    tanggalLahir: freshData.tanggal_lahir || ''
                };
                setFormData(loadedData);
                initialFormDataRef.current = { ...loadedData };
            } catch (e) {
                console.error('Gagal memuat data profil:', e);
                showModal({ type: 'network', title: 'Gagal Memuat Profil', message: 'Tidak dapat memuat data profil. Periksa koneksi internet Anda.' });
            }
        };

        fetchProfile();
    }, [showModal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ── Validasi Tanggal Lahir (usia minimal 18 tahun) ────────────────────────

    const validateTanggalLahir = (tanggal: string): string | null => {
        if (!tanggal) return 'Tanggal lahir wajib diisi';

        const dob = new Date(tanggal);
        if (isNaN(dob.getTime())) return 'Tanggal lahir tidak valid';

        const today = new Date();
        const dobMid = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
        const todMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (dobMid > todMid) {
            return 'Tanggal lahir tidak boleh di masa depan';
        }

        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

        if (age < 18) {
            return `Usia minimal 18 tahun`;
        }

        return null;
    };

    // ── Buka modal konfirmasi ──────────────────────────────────────────────────
    const openConfirmModal = () => {
        // Cek tanggal lahir (usia minimal 18 tahun)
        const tanggalError = validateTanggalLahir(formData.tanggalLahir);
        if (tanggalError) {
            setErrors({ tanggalLahir: tanggalError });
            showModal({
                type: 'warning',
                title: 'Tanggal Lahir Tidak Valid',
                message: tanggalError
            });
            return;
        }

        setErrors({});

        // Cek apakah ada perubahan dibanding data awal
        const initial = initialFormDataRef.current;
        const hasChanges = !initial ||
            formData.nama !== initial.nama ||
            formData.nuptk !== initial.nuptk ||
            formData.niy !== initial.niy ||
            formData.jenisKelamin !== initial.jenisKelamin ||
            formData.telepon !== initial.telepon ||
            formData.alamat !== initial.alamat ||
            formData.tempatLahir !== initial.tempatLahir ||
            formData.tanggalLahir !== initial.tanggalLahir;

        if (!hasChanges) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah. Silakan ubah data terlebih dahulu sebelum menyimpan.' });
            return;
        }

        setShowConfirmModal(true);
    };

    // ── Eksekusi submit (setelah konfirmasi) ────────────────────────────────────
    const executeSubmitProfile = async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        if (!token || !storedUser) {
            showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi login tidak valid. Silakan login ulang.' });
            return;
        }

        setIsSaving(true);
        try {
            const userData: UserProfile = JSON.parse(storedUser);
            const userId = userData.id;

            const response = await fetch(`http://localhost:5000/api/admin/admin/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nama_lengkap: formData.nama,
                    email_sekolah: formData.email,
                    niy: formData.niy,
                    nuptk: formData.nuptk,
                    jenis_kelamin: formData.jenisKelamin,
                    no_telepon: formData.telepon,
                    alamat: formData.alamat,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    status: 'aktif'
                })
            });

            if (response.ok) {
                const updatedUser: UserProfile = {
                    ...userData,
                    nama_lengkap: formData.nama,
                    email_sekolah: formData.email,
                    niy: formData.niy,
                    nuptk: formData.nuptk,
                    jenis_kelamin: formData.jenisKelamin,
                    no_telepon: formData.telepon,
                    alamat: formData.alamat,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                initialFormDataRef.current = { ...formData };
                showModal({ type: 'success', title: 'Profil Diperbarui!', message: 'Data profil Anda berhasil disimpan.' });
            } else {
                const error = await response.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: error.message || 'Terjadi kesalahan saat memperbarui profil.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Upload foto ────────────────────────────────────────────────────────────

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showModal({ type: 'warning', title: 'Format Tidak Didukung', message: 'Hanya file JPG, PNG, atau WebP yang diizinkan.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showModal({ type: 'warning', title: 'File Terlalu Besar', message: 'Ukuran file maksimal 5 MB.' });
            return;
        }

        setSelectedFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login tidak valid. Silakan login ulang.' });
            setIsUploading(false);
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('foto', file);

        try {
            const response = await fetch('http://localhost:5000/api/admin/admin/upload-foto', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload
            });

            const result = await response.json();
            if (response.ok && result.fotoPath) {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    userData.profileImage = result.fotoPath;
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                }
                window.dispatchEvent(new Event('profileImageUpdated'));
                setProfileImage(`http://localhost:5000${result.fotoPath}`);
                setPreviewImage(null);
                setSelectedFileName('');
                showModal({ type: 'success', title: 'Foto Diperbarui!', message: 'Foto profil Anda berhasil diupload.' });
            } else {
                throw new Error(result.message || 'Upload gagal');
            }
        } catch (err: any) {
            showModal({ type: 'error', title: 'Upload Gagal', message: err.message || 'Gagal mengupload foto profil. Silakan coba lagi.' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Avatar initials ────────────────────────────────────────────────────────

    const initials = (formData.nama || '??')
        .split(' ').slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('') || '??';

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-3 sm:p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Page header */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profil</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola informasi akun dan foto profil Anda</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">

                {/* ── Profile Card (kiri) ─────────────────────────────────────────── */}
                <div className="lg:w-72 flex-shrink-0 w-full anim-in d2">
                    <div className="card-flat bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                        {/* Card header */}
                        <div className="px-4 sm:px-5 py-4" style={{ background: BRAND_GRADIENT }}>
                            <p className="text-sm font-bold text-white">Foto Profil</p>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col items-center gap-4">

                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center ring-4"
                                    style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)', ringColor: '#fde0c8' } as React.CSSProperties}>
                                    {(previewImage || profileImage) ? (
                                        <img
                                            src={previewImage || profileImage!}
                                            alt="Foto Profil"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-3xl font-bold" style={{ color: ACCENT_DARK }}>{initials}</span>
                                    )}
                                </div>
                                {/* Camera badge */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn-action absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all"
                                    style={{ background: BRAND_GRADIENT }}
                                    title="Ganti foto"
                                >
                                    <Camera size={14} className="text-white" />
                                </button>
                            </div>

                            {/* Nama & email */}
                            <div className="text-center">
                                <p className="font-bold text-gray-800 text-base">{formData.nama || 'Administrator'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{formData.email || ''}</p>
                            </div>

                            <div className="w-full" style={{ borderTop: '1px solid #f0f0f0' }} />

                            {/* Ubah Password */}
                            <ActionButton variant="primary" fullWidth onClick={() => router.push('/admin/ubah_password')}>
                                <Lock size={15} />
                                Ubah Password
                            </ActionButton>

                            <div className="w-full" style={{ borderTop: '1px solid #f0f0f0' }} />

                            {/* Ganti Foto */}
                            <div className="w-full">
                                <p className={labelCls} style={labelColor}>Ganti Foto Profil</p>

                                {/* Drop zone / file chooser */}
                                <div
                                    className="btn-action w-full flex items-center rounded-xl overflow-hidden cursor-pointer transition-all"
                                    style={{ border: '1px solid #f0f0f0', background: '#fafafa' }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="text-xs font-bold px-3 py-2 whitespace-nowrap"
                                        style={{ borderRight: '1px solid #fde0c8', color: ACCENT_DARK, background: '#fff5eb' }}>
                                        Pilih File
                                    </span>
                                    <span className="text-xs text-gray-400 px-3 py-2 truncate">
                                        {selectedFileName || 'Belum ada file dipilih'}
                                    </span>
                                </div>

                                <p className="text-[11px] text-gray-400 mt-1.5">Format .jpg | .jpeg | .png · Maks 5 MB</p>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUploadPhoto}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={isUploading}
                                />

                                {/* Upload button */}
                                <div className="mt-3">
                                    <ActionButton variant="primary" fullWidth disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                                        {isUploading ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                Mengupload...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={14} />
                                                Upload Foto
                                            </>
                                        )}
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Form Profil (kanan) ─────────────────────────────────────────── */}
                <div className="flex-1 w-full anim-in d3">
                    <div className="card-flat bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                        {/* Card header */}
                        <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <p className="text-sm sm:text-base font-bold text-white">Edit Profil</p>
                        </div>

                        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

                            {/* Nama */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                                <input type="text" name="nama" value={formData.nama} onChange={handleChange}
                                    placeholder="Masukkan nama lengkap" className={inputCls} required />
                            </div>

                            {/* Email (readonly) */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Email Akun</label>
                                <input type="email" name="email" value={formData.email}
                                    className={readonlyCls} readOnly />
                                <p className="text-xs text-gray-400 mt-0.5">Email tidak dapat diubah</p>
                            </div>

                            {/* NUPTK */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NUPTK</label>
                                <input type="text" name="nuptk" value={formData.nuptk} onChange={handleChange}
                                    placeholder="Nomor Unik Pendidik" className={inputCls} />
                            </div>

                            {/* NIY */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NIY</label>
                                <input type="text" name="niy" value={formData.niy} onChange={handleChange}
                                    placeholder="Nomor Induk Yayasan" className={inputCls} />
                            </div>

                            {/* Jenis Kelamin */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange}
                                    className={inputCls} required>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>

                            {/* Telepon */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Telepon</label>
                                <input type="tel" name="telepon" value={formData.telepon} onChange={handleChange}
                                    placeholder="Misal: 081234567890" className={inputCls} />
                            </div>

                            {/* Tempat Lahir*/}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>
                                    Tempat Lahir <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tempatLahir"
                                    value={formData.tempatLahir}
                                    onChange={handleChange}
                                    placeholder="Masukkan tempat lahir"
                                    className={inputCls}
                                    required
                                />
                            </div>

                            {/* Tanggal Lahir */}
                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>
                                    Tanggal Lahir <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="tanggalLahir"
                                    value={formData.tanggalLahir}
                                    onChange={(e) => {
                                        handleChange(e);
                                        if (errors.tanggalLahir) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.tanggalLahir;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    className={errors.tanggalLahir ? inputErrCls : inputCls}
                                    required
                                />
                                {errors.tanggalLahir && (
                                    <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.tanggalLahir}</p>
                                )}
                            </div>

                            {/* Alamat */}
                            <div className="md:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleChange}
                                    rows={3} placeholder="Masukkan alamat lengkap" className={inputCls} />
                            </div>
                        </div>

                        {/* Tombol Simpan */}
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                                <div className="flex justify-end">
                                    <ActionButton variant="primary" disabled={isSaving} onClick={openConfirmModal}>
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <User size={15} />
                                                Simpan Profil
                                            </>
                                        )}
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi Perubahan Profil
                            </h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-5">
                            Apakah Anda yakin ingin menyimpan perubahan profil ini?
                        </p>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmModal(false); executeSubmitProfile(); }}>
                                Simpan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;