/**
 * Nama File: profil_client.tsx
 * Fungsi: Komponen client-side untuk manajemen profil pengguna admin.
 *         Memungkinkan pengeditan data pribadi (nama, NUPTK, alamat, dsb.)
 *         dan pengunggahan foto profil.
 *         Data profil disinkronkan antara localStorage dan API backend.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan DataGuruPage & DataMataPelajaranPage
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Lock, Upload, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pf-fadeIn">
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

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const readonlyCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-500 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ProfilePage = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nama: '', nuptk: '', niy: '', jenisKelamin: 'Laki-laki',
    telepon: '', email: '', alamat: ''
  });

  const [profileImage,      setProfileImage]      = useState<string | null>(null);
  const [previewImage,      setPreviewImage]       = useState<string | null>(null);
  const [selectedFileName,  setSelectedFileName]   = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading,  setIsUploading]  = useState(false);
  const [isConfirmed,  setIsConfirmed]  = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);

  // Simpan data awal untuk mendeteksi perubahan
  const initialFormDataRef = useRef<typeof formData | null>(null);

  const [modal,    setModal]    = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── Fetch profil ───────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      const token       = localStorage.getItem('token');
      const storedUser  = localStorage.getItem('currentUser');

      if (!token || !storedUser) {
        window.location.href = '/login';
        return;
      }

      try {
        const userData: UserProfile = JSON.parse(storedUser);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

        if (!userData.profileImage || !userData.profileImage.trim()) {
          const res = await fetch(`http://localhost:5000/api/admin/admin/${userData.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const apiResponse = await res.json();
            const freshData   = apiResponse.data;
            const updatedUser = { ...userData, profileImage: freshData.profileImage || null };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            if (freshData.profileImage && freshData.profileImage.trim()) {
              setProfileImage(`${baseUrl}${freshData.profileImage}`);
            } else {
              setProfileImage(null);
            }
          }
        } else {
          setProfileImage(`${baseUrl}${userData.profileImage}`);
        }

        const loadedData = {
          nama:         userData.nama_lengkap  || '',
          nuptk:        userData.nuptk         || '',
          niy:          userData.niy           || '',
          jenisKelamin: userData.jenis_kelamin || 'Laki-laki',
          telepon:      userData.no_telepon    || '',
          email:        userData.email_sekolah || '',
          alamat:       userData.alamat        || ''
        };
        setFormData(loadedData);
        // Simpan snapshot data awal untuk deteksi perubahan
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

  // ── Submit profil ──────────────────────────────────────────────────────────

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Cek apakah ada perubahan dibanding data awal
    const initial = initialFormDataRef.current;
    const hasChanges = !initial ||
      formData.nama         !== initial.nama         ||
      formData.nuptk        !== initial.nuptk        ||
      formData.niy          !== initial.niy          ||
      formData.jenisKelamin !== initial.jenisKelamin ||
      formData.telepon      !== initial.telepon      ||
      formData.alamat       !== initial.alamat;

    if (!hasChanges) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah. Silakan ubah data terlebih dahulu sebelum menyimpan.' });
      return;
    }

    if (!isConfirmed) {
      showModal({ type: 'warning', title: 'Konfirmasi Diperlukan', message: 'Harap centang konfirmasi terlebih dahulu sebelum menyimpan perubahan.' });
      return;
    }

    const token      = localStorage.getItem('token');
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
          nama_lengkap:  formData.nama,
          email_sekolah: formData.email,
          niy:           formData.niy,
          nuptk:         formData.nuptk,
          jenis_kelamin: formData.jenisKelamin,
          no_telepon:    formData.telepon,
          alamat:        formData.alamat,
          status:        'aktif'
        })
      });

      if (response.ok) {
        const updatedUser: UserProfile = {
          ...userData,
          nama_lengkap:  formData.nama,
          email_sekolah: formData.email,
          niy:           formData.niy,
          nuptk:         formData.nuptk,
          jenis_kelamin: formData.jenisKelamin,
          no_telepon:    formData.telepon,
          alamat:        formData.alamat
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setIsConfirmed(false);
        // Update snapshot supaya submit berikutnya juga terdeteksi tidak ada perubahan
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
    <div className="p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola informasi akun dan foto profil Anda</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Profile Card (kiri) ─────────────────────────────────────────── */}
        <div className="lg:w-72 flex-shrink-0 w-full">
          <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

            {/* Card header */}
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
                {/* Camera badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all"
                  style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}
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

              <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />

              {/* Ubah Password */}
              <button
                type="button"
                onClick={() => router.push('/admin/ubah_password')}
                className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
              >
                <Lock size={15} />
                Ubah Password
              </button>

              <div className="w-full" style={{ borderTop: '1px solid #fde0c8' }} />

              {/* Ganti Foto */}
              <div className="w-full">
                <p className="text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>Ganti Foto Profil</p>

                {/* Drop zone / file chooser */}
                <div
                  className="w-full flex items-center rounded-xl overflow-hidden cursor-pointer transition-all"
                  style={{ border: '1px solid #fde0c8', background: '#fffaf6' }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fffaf6')}
                >
                  <span className="text-xs font-semibold px-3 py-2 whitespace-nowrap"
                    style={{ borderRight: '1px solid #fde0c8', color: '#7a3a0a', background: '#fff0e5' }}>
                    Pilih File
                  </span>
                  <span className="text-xs text-gray-400 px-3 py-2 truncate">
                    {selectedFileName || 'Belum ada file dipilih'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-1.5">Format .jpg | .jpeg | .png · Maks 5 MB</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadPhoto}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploading}
                />

                {/* Upload button */}
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

            {/* Card header */}
            <div className="px-6 py-4" style={HEADER_GRAD}>
              <p className="text-base font-bold text-white">Edit Profil</p>
            </div>

            <form onSubmit={handleSubmitProfile}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Nama */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                  <input type="text" name="nama" value={formData.nama} onChange={handleChange}
                    placeholder="Masukkan nama lengkap" className={inputCls} required />
                </div>

                {/* Email (readonly) */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>Email Akun</label>
                  <input type="email" name="email" value={formData.email}
                    className={readonlyCls} readOnly />
                  <p className="text-xs text-gray-400">Email tidak dapat diubah</p>
                </div>

                {/* NUPTK */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>NUPTK</label>
                  <input type="text" name="nuptk" value={formData.nuptk} onChange={handleChange}
                    placeholder="Nomor Unik Pendidik" className={inputCls} />
                </div>

                {/* NIY */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>NIY</label>
                  <input type="text" name="niy" value={formData.niy} onChange={handleChange}
                    placeholder="Nomor Induk Yayasan" className={inputCls} />
                </div>

                {/* Jenis Kelamin */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                  <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange}
                    className={inputCls} required>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* Telepon */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>Telepon</label>
                  <input type="tel" name="telepon" value={formData.telepon} onChange={handleChange}
                    placeholder="Misal: 081234567890" className={inputCls} />
                </div>

                {/* Alamat */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>Alamat</label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleChange}
                    rows={3} placeholder="Masukkan alamat lengkap" className={inputCls} />
                </div>
              </div>

              {/* Konfirmasi + Simpan */}
              <div className="px-6 pb-6">
                <div className="pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                  <label className="flex items-start gap-2 cursor-pointer mb-5">
                    <input
                      type="checkbox" id="confirm"
                      checked={isConfirmed}
                      onChange={e => setIsConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-orange-500"
                    />
                    <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                      Saya yakin akan mengubah data tersebut
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="submit"
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;