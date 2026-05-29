// ============================================================
// File: profil_client.tsx
// Fungsi: Komponen utama untuk mengelola profil pengguna (guru kelas),
//         termasuk upload foto profil. Bagian ubah kata sandi
//         dipindahkan ke halaman terpisah: /guru_kelas/ubah_password
// Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
// Tanggal: 15 September 2025
// Tema: Oranye elegan — konsisten dengan halaman guru kelas lainnya

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, Lock, User } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

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
    profileImage?: string;
}

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes in-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes in-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes in-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes in-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .in-fadeIn  { animation: in-fadeIn  0.2s ease; }
        .in-scaleIn { animation: in-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .in-pulse   { animation: in-pulse   0.6s ease 0.15s; }
        .in-slideUp { animation: in-slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
    `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_META: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const m = MODAL_META[modal.type];
    const handleOk = () => { onClose(); modal.onConfirm?.(); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn"
                style={{ border: '1px solid #fde0c8' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${m.iconBg} flex items-center justify-center ring-8 ${m.ring} in-pulse`}>{m.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={handleOk} className={`w-full ${m.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const readOnlyCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-400 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";
const labelCls    = "block text-sm font-semibold mb-1.5";
const labelColor  = { color: '#7a3a0a' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ProfilClient = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const router  = useRouter();

    const [formData, setFormData] = useState({
        nama: '', nuptk: '', niy: '',
        jenisKelamin: 'Laki-laki',
        telepon: '', email: '', alamat: '',
    });
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
    const [isConfirmed, setIsConfirmed]         = useState(false);
    const [roleLabel, setRoleLabel]             = useState('Guru Kelas');
    const [profileImage, setProfileImage]       = useState<string | null>(null);
    const [previewImage, setPreviewImage]       = useState<string | null>(null);
    const [isUploading, setIsUploading]         = useState(false);
    const [isSaving, setIsSaving]               = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [modal, setModal]      = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── Muat data user ─────────────────────────────────────────────────────────

    useEffect(() => {
        const stored = localStorage.getItem('currentUser');
        if (!stored) { window.location.href = '/login'; return; }
        try {
            const user: UserProfile = JSON.parse(stored);
            const initial = {
                nama:         user.nama_lengkap  || '',
                nuptk:        user.nuptk          || '',
                niy:          user.niy            || '',
                jenisKelamin: user.jenis_kelamin  || 'Laki-laki',
                telepon:      user.no_telepon     || '',
                email:        user.email_sekolah  || '',
                alamat:       user.alamat         || '',
            };
            setFormData(initial);
            setInitialFormData(initial);
            if (user.profileImage) {
                const imgUrl = user.profileImage.startsWith('/')
                    ? `${API_URL}${user.profileImage}`
                    : `${API_URL}/${user.profileImage}`;
                setProfileImage(imgUrl);
            }
            const roleMap: Record<string, string> = {
                admin: 'Admin', guru: 'Guru',
                'guru kelas': 'Guru Kelas', guru_kelas: 'Guru Kelas',
                'guru bidang studi': 'Guru Bidang Studi',
            };
            setRoleLabel(roleMap[user.role] || 'Guru');
        } catch (e) {
            console.error('Gagal memuat profil', e);
            window.location.href = '/login';
        }
    }, [API_URL]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ── Upload Foto ────────────────────────────────────────────────────────────

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showModal({ type: 'warning', title: 'Format Tidak Didukung', message: 'Hanya file JPG, PNG, atau WebP yang diizinkan.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showModal({ type: 'warning', title: 'File Terlalu Besar', message: 'Ukuran file maksimal 5MB.' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login terlebih dahulu.' }); setIsUploading(false); return; }

        const fd = new FormData();
        fd.append('foto', file);
        try {
            const res    = await fetch(`${API_URL}/api/guru-kelas/upload_foto`, {
                method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Upload gagal');

            let updatedUser: any;
            if (result.user) {
                updatedUser = { ...result.user, profileImage: result.user.profileImage || result.user.foto_path || null, role: result.user.role || 'guru kelas' };
            } else if (result.fotoPath) {
                const s = localStorage.getItem('currentUser');
                if (!s) throw new Error('Sesi user tidak valid');
                updatedUser = { ...JSON.parse(s), profileImage: result.fotoPath };
            } else throw new Error('Respons tidak berisi data foto');

            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('userDataUpdated'));
            const imgUrl = updatedUser.profileImage?.startsWith('/')
                ? `${API_URL}${updatedUser.profileImage}`
                : updatedUser.profileImage ? `${API_URL}/${updatedUser.profileImage}` : null;
            setProfileImage(imgUrl);
            setPreviewImage(null);
            showModal({ type: 'success', title: 'Foto Diperbarui!', message: 'Foto profil berhasil diupload.' });
        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Upload', message: 'Gagal mengupload foto: ' + (err.message || 'Terjadi kesalahan.') });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Simpan Profil ──────────────────────────────────────────────────────────

    const handleSubmitProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (initialFormData && JSON.stringify(initialFormData) === JSON.stringify(formData)) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data profil tidak berubah.' });
            return;
        }
        if (!isConfirmed) {
            showModal({ type: 'warning', title: 'Konfirmasi Diperlukan', message: 'Harap centang kotak konfirmasi terlebih dahulu.' });
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login ulang.' }); return; }

        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/guru-kelas/profil`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_lengkap: formData.nama, email_sekolah: formData.email,
                    niy: formData.niy, nuptk: formData.nuptk,
                    jenis_kelamin: formData.jenisKelamin, no_telepon: formData.telepon,
                    alamat: formData.alamat,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal memperbarui profil.' });
                return;
            }
            const result = await res.json();
            if (!result.user) { showModal({ type: 'error', title: 'Respons Tidak Valid', message: 'Hubungi administrator.' }); return; }
            const normalized = { ...result.user, profileImage: result.user.profileImage || result.user.foto_path || null, role: result.user.role || 'guru kelas' };
            localStorage.setItem('currentUser', JSON.stringify(normalized));
            window.dispatchEvent(new Event('userDataUpdated'));
            showModal({ type: 'success', title: 'Profil Diperbarui!', message: 'Data profil berhasil disimpan.', onConfirm: () => window.location.reload() });
        } catch (err: any) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Avatar inisial ────────────────────────────────────────────────────────

    const initials = (formData.nama || '??').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '??';

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 p-6 min-h-screen" style={{ background: '#fdf6f0' }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola informasi pribadi dan foto profil Anda
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 items-start">

                {/* ── Kolom kiri: foto & shortcut ─────────────────────────── */}
                <div className="lg:w-56 flex-shrink-0 flex flex-col gap-4">

                    {/* Foto profil card */}
                    <div className="bg-white rounded-2xl overflow-hidden in-slideUp" style={CARD_STYLE}>
                        <div className="py-3 px-4 text-center text-xs font-bold text-white" style={HEADER_GRAD}>
                            Foto Profil
                        </div>
                        <div className="p-5 flex flex-col items-center gap-3">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 4px 14px rgba(232,105,10,0.35)' }}>
                                    {previewImage ? (
                                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                    ) : profileImage ? (
                                        <img src={profileImage} alt="Foto Profil" className="w-full h-full object-cover"
                                            onError={() => setProfileImage(null)} />
                                    ) : (
                                        <span className="text-white text-2xl font-bold">{initials}</span>
                                    )}
                                </div>
                                {/* Badge role */}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ background: '#eaf7ef', border: '2px solid white' }}>
                                    <User size={11} style={{ color: '#16a34a' }} />
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-800 leading-tight">{formData.nama || '—'}</p>
                                <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>{roleLabel}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                                style={{ background: '#fff0e5', border: '1px solid #fde0c8', color: '#c95b08' }}
                                onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = '#ffe4c8'; }}
                                onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = '#fff0e5'; }}
                            >
                                {isUploading ? (
                                    <><div className="w-3.5 h-3.5 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" /> Mengupload...</>
                                ) : (
                                    <><Camera size={13} /> Ganti Foto</>
                                )}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleUploadPhoto}
                                accept="image/*" className="hidden" disabled={isUploading} />
                            <p className="text-[10px] text-center text-gray-400">JPG, PNG, WebP · Maks. 5MB</p>
                        </div>
                    </div>

                    {/* Shortcut ubah kata sandi */}
                    <button
                        onClick={() => router.push('/guru_kelas/ubah_password')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all in-slideUp"
                        style={{ background: '#fff', ...CARD_STYLE, color: '#7a3a0a', animationDelay: '0.05s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: '#fff0e5' }}>
                            <Lock size={14} style={{ color: '#e8690a' }} />
                        </div>
                        <span>Ubah Kata Sandi</span>
                        <span className="ml-auto text-gray-300">›</span>
                    </button>
                </div>

                {/* ── Kolom kanan: form profil ─────────────────────────────── */}
                <div className="flex-1 in-slideUp" style={{ animationDelay: '0.07s' }}>
                    <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                        {/* Card header */}
                        <div className="px-6 py-4" style={HEADER_GRAD}>
                            <h2 className="text-sm font-bold text-white">Edit Profil</h2>
                            <p className="text-[11px] text-white/80 mt-0.5">Perbarui informasi pribadi Anda</p>
                        </div>

                        <form onSubmit={handleSubmitProfile} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Nama */}
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        Nama Lengkap <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" name="nama" value={formData.nama}
                                        onChange={handleChange} required className={inputCls}
                                        placeholder="Nama lengkap" />
                                </div>

                                {/* Jenis Kelamin */}
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        Jenis Kelamin <span className="text-red-500">*</span>
                                    </label>
                                    <select name="jenisKelamin" value={formData.jenisKelamin}
                                        onChange={handleChange} required
                                        className="w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200">
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>

                                {/* NUPTK */}
                                <div>
                                    <label className={labelCls} style={labelColor}>NUPTK</label>
                                    <input type="text" name="nuptk" value={formData.nuptk}
                                        onChange={handleChange} className={inputCls}
                                        placeholder="Nomor NUPTK" />
                                </div>

                                {/* NIY */}
                                <div>
                                    <label className={labelCls} style={labelColor}>NIY</label>
                                    <input type="text" name="niy" value={formData.niy}
                                        onChange={handleChange} className={inputCls}
                                        placeholder="Nomor NIY" />
                                </div>

                                {/* Telepon */}
                                <div>
                                    <label className={labelCls} style={labelColor}>No. Telepon</label>
                                    <input type="tel" name="telepon" value={formData.telepon}
                                        onChange={handleChange} className={inputCls}
                                        placeholder="08xx-xxxx-xxxx" />
                                </div>

                                {/* Email (read-only) */}
                                <div>
                                    <label className={labelCls} style={{ color: '#9ca3af' }}>
                                        Email <span className="text-xs font-normal text-gray-400">(tidak dapat diubah)</span>
                                    </label>
                                    <input type="email" name="email" value={formData.email}
                                        readOnly className={readOnlyCls} />
                                </div>
                            </div>

                            {/* Alamat */}
                            <div className="mt-4">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat}
                                    onChange={handleChange} rows={2}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400 resize-none"
                                    placeholder="Alamat lengkap" />
                            </div>

                            {/* Konfirmasi checkbox */}
                            <div className="flex items-center gap-2.5 mt-5 pt-4"
                                style={{ borderTop: '1px solid #fde0c8' }}>
                                <div
                                    onClick={() => setIsConfirmed(v => !v)}
                                    className="w-5 h-5 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0 transition-all"
                                    style={{
                                        background: isConfirmed ? 'linear-gradient(135deg,#e8690a,#f5a623)' : '#fff',
                                        border: isConfirmed ? 'none' : '2px solid #fde0c8',
                                        boxShadow: isConfirmed ? '0 2px 6px rgba(232,105,10,0.3)' : 'none',
                                    }}
                                >
                                    {isConfirmed && <CheckCircle2 size={13} className="text-white" />}
                                </div>
                                <label
                                    onClick={() => setIsConfirmed(v => !v)}
                                    className="text-sm cursor-pointer select-none"
                                    style={{ color: '#7a3a0a' }}
                                >
                                    Saya yakin akan mengubah data ini
                                </label>
                            </div>

                            {/* Submit */}
                            <div className="mt-5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving || isUploading}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                    onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                                >
                                    {isSaving ? (
                                        <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                                    ) : 'Simpan Profil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilClient;