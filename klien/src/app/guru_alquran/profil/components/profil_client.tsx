'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';
import NotifModal from './notif_modal';
import ConfirmModal from './confirm_modal';
import ProfileCard from './profil_card';
import ProfileForm from './profil_form';

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes pf-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pf-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pf-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes pf-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .pf-fadeIn { animation: pf-fadeIn 0.2s ease; }
        .pf-scaleIn { animation: pf-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .pf-pulse { animation: pf-pulse 0.6s ease 0.15s; }
        .anim-in { animation: pf-slideUp 0.5s ease forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.1s; } .d3 { animation-delay: 0.15s; }
    `}</style>
);

export default function ProfilePage() {
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const [formData, setFormData] = useState({ nama: '', nuptk: '', niy: '', jenisKelamin: 'Laki-laki', telepon: '', email: '', alamat: '', tempatLahir: '', tanggalLahir: '' });
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modal, setModal] = useState<any>(null);
    
    const initialFormDataRef = useRef<typeof formData | null>(null);
    const showModal = useCallback((cfg: any) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('currentUser');
            if (!token || !storedUser) { window.location.href = '/login'; return; }
            try {
                const userData = JSON.parse(storedUser);
                const res = await fetch(`${API_URL}/api/guru_alquran/profil`, { headers: { Authorization: `Bearer ${token}` } }); // ✅ Ganti endpoint sesuai modul
                let freshData: any = userData;
                if (res.ok) {
                    const apiResponse = await res.json();
                    freshData = apiResponse.user || apiResponse.data || apiResponse;
                    const updatedUser = { ...userData, nama_lengkap: freshData.nama_lengkap || userData.nama_lengkap, email_sekolah: freshData.email_sekolah || userData.email_sekolah, niy: freshData.niy || '', nuptk: freshData.nuptk || '', jenis_kelamin: freshData.jenis_kelamin || 'Laki-laki', no_telepon: freshData.no_telepon || '', alamat: freshData.alamat || '', tempat_lahir: freshData.tempat_lahir || '', tanggal_lahir: freshData.tanggal_lahir || null, profileImage: freshData.profileImage || freshData.foto_path || null };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                }
                if (freshData.profileImage && freshData.profileImage.trim()) {
                    setProfileImage(freshData.profileImage.startsWith('http') ? freshData.profileImage : `${API_URL}${freshData.profileImage.startsWith('/') ? '' : '/'}${freshData.profileImage}`);
                }
                const loadedData = { nama: freshData.nama_lengkap || '', nuptk: freshData.nuptk || '', niy: freshData.niy || '', jenisKelamin: freshData.jenis_kelamin || 'Laki-laki', telepon: freshData.no_telepon || '', email: freshData.email_sekolah || '', alamat: freshData.alamat || '', tempatLahir: freshData.tempat_lahir || '', tanggalLahir: freshData.tanggal_lahir || '' };
                setFormData(loadedData);
                initialFormDataRef.current = { ...loadedData };
            } catch (e) {
                showModal({ type: 'network', title: 'Gagal Memuat Profil', message: 'Tidak dapat memuat data profil.' });
            }
        };
        fetchProfile();
    }, [API_URL, showModal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validateTanggalLahir = (tanggal: string): string | null => {
        if (!tanggal) return 'Tanggal lahir wajib diisi';
        const dob = new Date(tanggal);
        if (isNaN(dob.getTime())) return 'Tanggal lahir tidak valid';
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) return 'Usia minimal 18 tahun';
        return null;
    };

    const openConfirmModal = () => {
        const tanggalError = validateTanggalLahir(formData.tanggalLahir);
        if (tanggalError) {
            setErrors({ tanggalLahir: tanggalError });
            showModal({ type: 'warning', title: 'Tanggal Lahir Tidak Valid', message: tanggalError });
            return;
        }
        setErrors({});
        const initial = initialFormDataRef.current;
        const hasChanges = !initial || formData.nama !== initial.nama || formData.nuptk !== initial.nuptk || formData.niy !== initial.niy || formData.jenisKelamin !== initial.jenisKelamin || formData.telepon !== initial.telepon || formData.alamat !== initial.alamat || formData.tempatLahir !== initial.tempatLahir || formData.tanggalLahir !== initial.tanggalLahir;
        if (!hasChanges) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            return;
        }
        setShowConfirmModal(true);
    };

    const executeSubmitProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setIsSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/guru_alquran/profil`, { // ✅ Ganti endpoint sesuai modul
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nama_lengkap: formData.nama, email_sekolah: formData.email, niy: formData.niy, nuptk: formData.nuptk, jenis_kelamin: formData.jenisKelamin, no_telepon: formData.telepon, alamat: formData.alamat, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir })
            });
            if (response.ok) {
                const result = await response.json();
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    localStorage.setItem('currentUser', JSON.stringify({ ...userData, ...result.user, nama_lengkap: formData.nama, email_sekolah: formData.email, niy: formData.niy, nuptk: formData.nuptk, jenis_kelamin: formData.jenisKelamin, no_telepon: formData.telepon, alamat: formData.alamat, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir }));
                }
                window.dispatchEvent(new Event('userDataUpdated'));
                initialFormDataRef.current = { ...formData };
                showModal({ type: 'success', title: 'Profil Diperbarui!', message: 'Data profil Anda berhasil disimpan.' });
            } else {
                const error = await response.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: error.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setIsSaving(false);
        }
    };

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
        if (!token) { setIsUploading(false); return; }
        const formDataUpload = new FormData();
        formDataUpload.append('foto', file);
        try {
            const response = await fetch(`${API_URL}/api/guru_alquran/upload_foto`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formDataUpload }); // ✅ Ganti endpoint
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
                setProfileImage(result.fotoPath.startsWith('http') ? result.fotoPath : `${API_URL}${result.fotoPath.startsWith('/') ? '' : '/'}${result.fotoPath}`);
                setPreviewImage(null);
                setSelectedFileName('');
                showModal({ type: 'success', title: 'Foto Diperbarui!', message: 'Foto profil Anda berhasil diupload.' });
            } else {
                throw new Error(result.message || 'Upload gagal');
            }
        } catch (err: any) {
            showModal({ type: 'error', title: 'Upload Gagal', message: err.message || 'Gagal mengupload foto profil.' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-6 min-h-screen" style={{ background: '#ffffff' }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
            <div className="mb-6 anim-in d1">
                <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola informasi akun dan foto profil Anda</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <ProfileCard nama={formData.nama} email={formData.email} profileImage={profileImage} previewImage={previewImage} selectedFileName={selectedFileName} isUploading={isUploading} onFileSelect={handleUploadPhoto} fileInputRef={fileInputRef} />
                <ProfileForm formData={formData} errors={errors} isSaving={isSaving} onChange={handleChange} onClearError={(field) => setErrors(prev => { const n = { ...prev }; delete n[field]; return n; })} onSubmit={openConfirmModal} />
            </div>
            <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={executeSubmitProfile} isSaving={isSaving} />
        </div>
    );
}