/**
 * Nama File: profil_client.tsx
 * Fungsi: Komponen client-side untuk manajemen profil pengguna admin.
 *         Memungkinkan pengeditan data pribadi (nama, NUPTK, alamat, dsb.)
 *         dan pengunggahan foto profil.
 *         Data profil disinkronkan antara localStorage dan API backend.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Lock, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

const ProfilePage = () => {
    const router = useRouter();

    const [formData, setFormData] = useState({
        nama: '',
        nuptk: '',
        niy: '',
        jenisKelamin: 'Laki-laki',
        telepon: '',
        email: '',
        alamat: ''
    });

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

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

                if (!userData.profileImage || !userData.profileImage.trim()) {
                    const res = await fetch(`http://localhost:5000/api/admin/admin/${userData.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const apiResponse = await res.json();
                        const freshData = apiResponse.data;

                        const updatedUser = {
                            ...userData,
                            profileImage: freshData.profileImage || null
                        };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                        if (freshData.profileImage && freshData.profileImage.trim()) {
                            setProfileImage(`${baseUrl}${freshData.profileImage}`);
                        } else {
                            setProfileImage(null);
                        }
                    }
                } else {
                    if (userData.profileImage && userData.profileImage.trim()) {
                        setProfileImage(`${baseUrl}${userData.profileImage}`);
                    } else {
                        setProfileImage(null);
                    }
                }

                setFormData({
                    nama: userData.nama_lengkap || '',
                    nuptk: userData.nuptk || '',
                    niy: userData.niy || '',
                    jenisKelamin: userData.jenis_kelamin || 'Laki-laki',
                    telepon: userData.no_telepon || '',
                    email: userData.email_sekolah || '',
                    alamat: userData.alamat || ''
                });
            } catch (e) {
                console.error('Gagal memuat data profil:', e);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmitProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmed) {
            alert('Harap centang konfirmasi terlebih dahulu!');
            return;
        }

        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        if (!token || !storedUser) {
            alert('Sesi login tidak valid. Silakan login ulang.');
            return;
        }

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
                    alamat: formData.alamat
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                alert('Profil berhasil diperbarui!');
                window.location.reload();
            } else {
                const error = await response.json();
                alert(error.message || 'Gagal memperbarui profil');
            }
        } catch (err) {
            console.error(err);
            alert('Gagal terhubung ke server');
        }
    };

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Hanya file JPG, PNG, atau WebP yang diizinkan');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB');
            return;
        }

        setSelectedFileName(file.name);

        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login tidak valid.');
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
                alert('Foto profil berhasil diupload!');
            } else {
                throw new Error(result.message || 'Upload gagal');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Gagal mengupload foto');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Profile Card */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex flex-col items-center text-center gap-3">

                            {/* Avatar */}
                            <div className="relative w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                                {previewImage ? (
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                ) : profileImage ? (
                                    <img src={profileImage} alt="Foto Profil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-600 text-xl font-semibold flex items-center justify-center w-full h-full">
                                        {(formData.nama || '??')
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((word) => word[0]?.toUpperCase() || '')
                                            .join('') || '??'}
                                    </span>
                                )}
                            </div>

                            {/* Nama & Role */}
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{formData.nama || 'Administrator'}</p>
                                <p className="text-xs text-gray-500">{formData.email || ''}</p>
                            </div>

                            <hr className="w-full border-gray-100" />

                            {/* Tombol Ubah Password - mirip referensi */}
                            <button
                                type="button"
                                onClick={() => router.push('/admin/ubah_password')}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
                            >
                                <Lock size={15} />
                                Ubah Password
                            </button>

                            <hr className="w-full border-gray-100" />

                            {/* Ganti Foto - layout seperti referensi */}
                            <div className="w-full text-left">
                                <p className="text-sm text-gray-600 mb-2">Ganti Foto Profile:</p>

                                {/* File input styled like reference */}
                                <div
                                    className="w-full flex items-center border border-gray-300 rounded-lg overflow-hidden cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 border-r border-gray-300 whitespace-nowrap">
                                        Choose File
                                    </span>
                                    <span className="text-xs text-gray-400 px-3 py-2 truncate">
                                        {selectedFileName || 'No file chosen'}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-400 mt-1.5">
                                    Format File .jpg | .jpeg | .png | maks size. 5 Mb
                                </p>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUploadPhoto}
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={isUploading}
                                />

                                {/* Upload Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="mt-3 w-full flex items-center justify-end gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                                >
                                    <Upload size={14} />
                                    {isUploading ? 'Mengupload...' : 'Upload Photo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Profil */}
                <div className="flex-1">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-5">Edit Profil</h2>
                        <form onSubmit={handleSubmitProfile}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nama <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="nama"
                                            value={formData.nama}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NUPTK</label>
                                        <input
                                            type="text"
                                            name="nuptk"
                                            value={formData.nuptk}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NIY</label>
                                        <input
                                            type="text"
                                            name="niy"
                                            value={formData.niy}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Jenis Kelamin <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="jenisKelamin"
                                            value={formData.jenisKelamin}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                                        <input
                                            type="tel"
                                            name="telepon"
                                            value={formData.telepon}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                <textarea
                                    name="alamat"
                                    value={formData.alamat}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200">
                                <input
                                    type="checkbox"
                                    id="confirm"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="confirm" className="text-sm text-gray-700">
                                    Saya yakin akan mengubah data tersebut
                                </label>
                            </div>
                            <div className="mt-5">
                                <button
                                    type="submit"
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded text-sm transition"
                                >
                                    Simpan Profil
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;