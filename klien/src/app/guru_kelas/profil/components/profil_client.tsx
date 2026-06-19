/**
 * Nama File: profil_client.tsx
 * Fungsi: Komponen client-side untuk manajemen profil guru kelas.
 *         Memungkinkan pengeditan data pribadi (nama, NUPTK, alamat, tempat/tanggal lahir, dsb.)
 *         dan pengunggahan foto profil.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 * Update: 
 *   - Template disesuaikan dengan profil Admin (tambah tempat/tanggal lahir, validasi usia)
 *   - Hapus checkbox konfirmasi, ganti dengan popup modal konfirmasi sederhana
 * UI: Tema oranye elegan, konsisten dengan DataMataPelajaranPage & Profil Admin
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Lock, Upload, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, User, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

interface UserProfile {
    id: number;
    role: string;
    nama_lengkap: string;
    email_sekolah: string;
    niy?: string;
    nuptk?: string;
    jenis_kelamin?: string;
    alamat?: string;
    no_telepon?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string | null;
    profileImage?: string;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes pf-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pf-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes pf-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .pf-fadeIn  { animation: pf-fadeIn  0.2s ease; }
    .pf-scaleIn { animation: pf-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .pf-pulse   { animation: pf-pulse   0.6s ease 0.15s; }
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pf-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 pf-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} pf-pulse`}>
                    {s.icon}
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";
const readonlyCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-500 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const ProfilePage = () => {
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

    // ✅ TAMBAHAN: State untuk modal konfirmasi
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const initialFormDataRef = useRef<typeof formData | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ─ Fetch profil ───────────────────────────────────────────────────────────

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

                const res = await fetch(`${API_URL}/api/guru-kelas/profil`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                let freshData: any = userData;

                if (res.ok) {
                    const apiResponse = await res.json();
                    freshData = apiResponse.user || apiResponse.data || apiResponse;

                    const updatedUser = {
                        ...userData,
                        nama_lengkap: freshData.nama_lengkap || userData.nama_lengkap,
                        email_sekolah: freshData.email_sekolah || userData.email_sekolah,
                        niy: freshData.niy || userData.niy || '',
                        nuptk: freshData.nuptk || userData.nuptk || '',
                        jenis_kelamin: freshData.jenis_kelamin || userData.jenis_kelamin || 'Laki-laki',
                        no_telepon: freshData.no_telepon || userData.no_telepon || '',
                        alamat: freshData.alamat || userData.alamat || '',
                        tempat_lahir: freshData.tempat_lahir || '',
                        tanggal_lahir: freshData.tanggal_lahir || null,
                        profileImage: freshData.profileImage || freshData.foto_path || null
                    };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                }

                if (freshData.profileImage && freshData.profileImage.trim()) {
                    const imgUrl = freshData.profileImage.startsWith('http')
                        ? freshData.profileImage
                        : freshData.profileImage.startsWith('/')
                            ? `${API_URL}${freshData.profileImage}`
                            : `${API_URL}/${freshData.profileImage}`;
                    setProfileImage(imgUrl);
                } else {
                    setProfileImage(null);
                }

                const loadedData = {
                    nama: freshData.nama_lengkap || '',
                    nuptk: freshData.nuptk || '',
                    niy: freshData.niy || '',
                    jenisKelamin: freshData.jenis_kelamin || 'Laki-laki',
                    telepon: freshData.no_telepon || '',
                    email: freshData.email_sekolah || '',
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
    }, [API_URL, showModal]);

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

    // ✅ TAMBAHAN: Buka modal konfirmasi
    const openConfirmModal = () => {
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

    // ✅ TAMBAHAN: Eksekusi submit profil (setelah konfirmasi)
    const executeSubmitProfile = async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        if (!token || !storedUser) {
            showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi login tidak valid. Silakan login ulang.' });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/guru-kelas/profil`, {
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
                })
            });

            if (response.ok) {
                const result = await response.json();
                const userData: UserProfile = JSON.parse(storedUser);

                const updatedUser: UserProfile = {
                    ...userData,
                    ...result.user,
                    nama_lengkap: formData.nama,
                    email_sekolah: formData.email,
                    niy: formData.niy,
                    nuptk: formData.nuptk,
                    jenis_kelamin: formData.jenisKelamin,
                    no_telepon: formData.telepon,
                    alamat: formData.alamat,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    profileImage: result.user?.profileImage || result.user?.foto_path || userData.profileImage,
                };

                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                window.dispatchEvent(new Event('userDataUpdated'));

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
            const response = await fetch(`${API_URL}/api/guru-kelas/upload_foto`, {
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
                window.dispatchEvent(new Event('userDataUpdated'));

                const imgUrl = result.fotoPath.startsWith('http')
                    ? result.fotoPath
                    : result.fotoPath.startsWith('/')
                        ? `${API_URL}${result.fotoPath}`
                        : `${API_URL}/${result.fotoPath}`;
                setProfileImage(imgUrl);
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
        <div className="p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola informasi akun dan foto profil Anda</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* ── Profile Card (kiri) ─────────────────────────────────────────── */}
                <div className="lg:w-72 flex-shrink-0 w-full">
                    <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                        <div className="px-5 py-4" style={HEADER_GRAD}>
                            <p className="text-sm font-bold text-white">Foto Profil</p>
                        </div>

                        <div className="p-6 flex flex-col items-center gap-4">

                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center ring-4"
                                    style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)', ringColor: '#fde0c8' }}>
                                    {(previewImage || profileImage) ? (
                                        <img
                                            src={previewImage || profileImage!}
                                            alt="Foto Profil"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-3xl font-bold" style={{ color: '#c95b08' }}>{initials}</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}
                                    title="Ganti foto"
                                >
                                    <Camera size={14} className="text-white" />
                                </button>
                            </div>

                            {/* Nama & role */}
                            <div className="text-center">
                                <p className="font-bold text-gray-800 text-base">{formData.nama || 'Guru Kelas'}</p>
                                <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block"
                                    style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                    Guru Kelas
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{formData.email || ''}</p>
                            </div>

                            <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />

                            <button
                                type="button"
                                onClick={() => router.push('/guru_kelas/ubah_password')}
                                className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                            >
                                <KeyRound size={15} />
                                Ubah Password
                            </button>

                            <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />

                            {/* Ganti Foto */}
                            <div className="w-full">
                                <p className="text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>Ganti Foto Profil</p>

                                <div
                                    className="w-full flex items-center rounded-xl overflow-hidden cursor-pointer transition-all"
                                    style={{ border: '1px solid #fde0c8', background: '#fffaf6' }}
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = '#fff0e5'; }}
                                    onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = '#fffaf6'; }}
                                >
                                    <span className="text-xs font-semibold px-3 py-2 whitespace-nowrap"
                                        style={{ borderRight: '1px solid #fde0c8', color: '#7a3a0a', background: '#fff0e5' }}>
                                        Pilih File
                                    </span>
                                    <span className="text-xs text-gray-400 px-3 py-2 truncate">
                                        {selectedFileName || 'Belum ada file dipilih'}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-400 mt-1.5">Format .jpg | .jpeg | .png | .webp · Maks 5 MB</p>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUploadPhoto}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={isUploading}
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="mt-3 w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 2px 8px rgba(232,105,10,0.2)' }}
                                    onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                    onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                                >
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
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Form Profil (kanan) ─────────────────────────────────────────── */}
                <div className="flex-1 w-full">
                    <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                        <div className="px-6 py-4" style={HEADER_GRAD}>
                            <p className="text-base font-bold text-white">Edit Profil</p>
                        </div>

                        {/* ✅ HAPUS <form> tag, ganti dengan <div> */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                                <input type="text" name="nama" value={formData.nama} onChange={handleChange}
                                    placeholder="Masukkan nama lengkap" className={inputCls} required />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Email Akun</label>
                                <input type="email" name="email" value={formData.email}
                                    className={readonlyCls} readOnly />
                                <p className="text-xs text-gray-400">Email tidak dapat diubah</p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>NUPTK</label>
                                <input type="text" name="nuptk" value={formData.nuptk} onChange={handleChange}
                                    placeholder="Nomor Unik Pendidik" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>NIY</label>
                                <input type="text" name="niy" value={formData.niy} onChange={handleChange}
                                    placeholder="Nomor Induk Yayasan" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange}
                                    className={inputCls} required>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Telepon</label>
                                <input type="tel" name="telepon" value={formData.telepon} onChange={handleChange}
                                    placeholder="Misal: 081234567890" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1.5">
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

                            <div className="flex flex-col gap-1.5">
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
                                    <p className="text-red-500 text-xs flex items-center gap-1">
                                        {errors.tanggalLahir}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleChange}
                                    rows={3} placeholder="Masukkan alamat lengkap" className={inputCls} />
                            </div>
                        </div>

                        {/* ✅ HAPUS checkbox konfirmasi, ganti dengan button yang buka modal */}
                        <div className="px-6 pb-6">
                            <div className="pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={openConfirmModal}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                                        onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                        onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                                    >
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
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* ✅ TUTUP </div> sebagai pengganti </form> */}
                    </div>
                </div>
            </div>

            {/* ✅ TAMBAHAN: Modal Konfirmasi Sederhana */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 pf-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 pf-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi Perubahan Profil
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            Apakah Anda yakin ingin menyimpan perubahan profil ini?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    executeSubmitProfile();
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
};

export default ProfilePage;