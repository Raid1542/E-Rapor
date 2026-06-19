/**
 * Nama File: data_sekolah_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data profil sekolah oleh admin.
 *         Memungkinkan pengeditan informasi dasar sekolah (nama, NPSN, alamat, dsb.)
 *         dan pengunggahan logo sekolah. Data disimpan ke backend melalui API PUT,
 *         sedangkan logo diupload via FormData ke endpoint khusus.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: Hapus checkbox konfirmasi, ganti dengan popup modal konfirmasi sederhana
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 4px 24px rgba(200,80,10,0.09)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ animation: 'ds-fadeIn 0.2s ease' }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4"
                style={{ animation: 'ds-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring}`}
                    style={{ animation: 'ds-pulse 0.6s ease 0.15s' }}>
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
            <style>{`
                @keyframes ds-fadeIn  { from { opacity:0 } to { opacity:1 } }
                @keyframes ds-scaleIn { from { opacity:0; transform:scale(0.93) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
                @keyframes ds-pulse   { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
            `}</style>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataSekolahPage() {
    const { showSessionExpired, handleLogout } = useSession();

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        namaSekolah: '', npsn: '', nss: '', kodePos: '', telepon: '',
        alamat: '', email: '', website: '', kepalaSekolah: '',
        niyKepalaSekolah: ''
    });
    const [originalData, setOriginalData] = useState({
        namaSekolah: '', npsn: '', nss: '', kodePos: '', telepon: '',
        alamat: '', email: '', website: '', kepalaSekolah: '',
        niyKepalaSekolah: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [modal, setModal] = useState<ModalConfig | null>(null);

    // ✅ TAMBAHAN: State untuk modal konfirmasi
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    useEffect(() => { fetchSekolahData(); }, []);

    const fetchSekolahData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
                return;
            }
            const res = await fetch('http://localhost:5000/api/admin/sekolah', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const response = await res.json();
                const s = response.data || response.sekolah || {};
                const data = {
                    namaSekolah: s.nama_sekolah || '', npsn: s.npsn || '', nss: s.nss || '',
                    kodePos: s.kode_pos || '', telepon: s.telepon || '', alamat: s.alamat || '',
                    email: s.email || '', website: s.website || '',
                    kepalaSekolah: s.kepala_sekolah || '', niyKepalaSekolah: s.niy_kepala_sekolah || ''
                };
                setFormData(data);
                setOriginalData(data);
                setLogoPreview(s.logo_path ? `http://localhost:5000${s.logo_path}` : null);
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: err.message || 'Terjadi kesalahan saat memuat data sekolah.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                showModal({ type: 'warning', title: 'Format Tidak Didukung', message: 'Hanya file .jpg, .jpeg, atau .png yang diizinkan.' });
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const hasChanges = () => {
        return (
            formData.namaSekolah !== originalData.namaSekolah ||
            formData.npsn !== originalData.npsn ||
            formData.nss !== originalData.nss ||
            formData.kodePos !== originalData.kodePos ||
            formData.telepon !== originalData.telepon ||
            formData.alamat !== originalData.alamat ||
            formData.email !== originalData.email ||
            formData.website !== originalData.website ||
            formData.kepalaSekolah !== originalData.kepalaSekolah ||
            formData.niyKepalaSekolah !== originalData.niyKepalaSekolah
        );
    };

    // ✅ TAMBAHAN: Buka modal konfirmasi
    const openConfirmModal = () => {
        if (!formData.namaSekolah?.trim()) {
            showModal({
                type: 'warning',
                title: 'Nama Sekolah Wajib Diisi',
                message: 'Mohon masukkan nama sekolah sebelum menyimpan.'
            });
            return;
        }

        if (!hasChanges() && !selectedFile) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Tidak ada data yang berubah. Tidak perlu menyimpan.'
            });
            return;
        }

        setShowConfirmModal(true);
    };

    // ✅ TAMBAHAN: Eksekusi submit (setelah konfirmasi)
    const executeSubmit = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
                return;
            }

            // Simpan data sekolah
            const res = await fetch('http://localhost:5000/api/admin/sekolah', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    nama_sekolah: formData.namaSekolah, npsn: formData.npsn, nss: formData.nss,
                    alamat: formData.alamat, kode_pos: formData.kodePos, telepon: formData.telepon,
                    email: formData.email, website: formData.website,
                    kepala_sekolah: formData.kepalaSekolah, niy_kepala_sekolah: formData.niyKepalaSekolah
                })
            });
            if (!res.ok) {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan saat menyimpan data sekolah.' });
                return;
            }

            // Upload logo jika ada file baru
            if (selectedFile) {
                setUploading(true);
                const formDataLogo = new FormData();
                formDataLogo.append('logo', selectedFile);
                const resLogo = await fetch('http://localhost:5000/api/admin/sekolah/logo', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formDataLogo
                });
                const dataLogo = await resLogo.json();
                if (resLogo.ok && dataLogo.logoPath) {
                    setLogoPreview(`http://localhost:5000${dataLogo.logoPath}`);
                    window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoPath: dataLogo.logoPath } }));
                    setSelectedFile(null);
                    setFileInputKey(prev => prev + 1);
                } else {
                    showModal({ type: 'warning', title: 'Peringatan', message: 'Data berhasil disimpan, tetapi gagal mengupload logo.\n' + (dataLogo.message || '') });
                    setUploading(false);
                    setSaving(false);
                    return;
                }
                setUploading(false);
            }

            window.dispatchEvent(new CustomEvent('schoolUpdated'));
            setTimeout(fetchSekolahData, 300);
            showModal({ type: 'success', title: 'Data Berhasil Disimpan!', message: 'Informasi sekolah telah berhasil diperbarui.' });

        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={PAGE_BG}>
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data sekolah...</p>
                </div>
            </div>
        );
    }

    const isBusy = saving || uploading;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6 flex flex-col items-center" style={PAGE_BG}>

            {/* Notif modal */}
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Page header */}
            <div className="w-full max-w-3xl mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Sekolah</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola informasi dan logo sekolah</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card header */}
                <div className="px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">Informasi Sekolah</h2>
                    <p className="text-xs text-white/70 mt-0.5">Lengkapi semua informasi sekolah dengan benar</p>
                </div>

                <div className="p-6 sm:p-8">

                    {/* ── Logo section ── */}
                    <div className="flex flex-col items-center mb-8">

                        {/* Preview bulat */}
                        <div
                            className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden mb-4"
                            style={{ border: '3px dashed #fde0c8', background: '#fffaf6' }}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview Logo Sekolah"
                                    className="w-full h-full object-contain p-2"
                                    onError={() => setLogoPreview(null)} />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <svg className="w-10 h-10 mb-1" fill="none" stroke="#f5a623" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] font-medium" style={{ color: '#c95b08' }}>Belum ada logo</span>
                                </div>
                            )}
                        </div>

                        {/* Nama sekolah di bawah logo */}
                        {formData.namaSekolah && (
                            <p className="text-sm font-bold text-gray-700 mb-3 text-center">{formData.namaSekolah}</p>
                        )}

                        {/* Tombol pilih file */}
                        <label
                            className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-xs font-semibold transition-all"
                            style={{ border: '1.5px dashed #fde0c8', background: '#fffaf6', color: '#e8690a' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fffaf6')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {selectedFile ? selectedFile.name : 'Pilih Logo Baru'}
                            <input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/jpg"
                                onChange={handleLogoChange} className="hidden" />
                        </label>
                        <p className="text-[10px] mt-1.5" style={{ color: '#c95b08' }}>JPG, JPEG, PNG · maks. 2 MB</p>
                    </div>

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px" style={{ background: '#fde0c8' }} />
                        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#c95b08' }}>Informasi Umum</span>
                        <div className="flex-1 h-px" style={{ background: '#fde0c8' }} />
                    </div>

                    {/* ── Form fields ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                        {/* Nama Sekolah — full width */}
                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Nama Sekolah <span className="text-red-500">*</span></label>
                            <input type="text" name="namaSekolah" value={formData.namaSekolah}
                                onChange={handleInputChange} placeholder="Masukkan nama sekolah"
                                className={inputCls} />
                        </div>

                        {[
                            { label: 'NPSN', name: 'npsn', type: 'text' },
                            { label: 'NSS', name: 'nss', type: 'text' },
                            { label: 'Kode POS', name: 'kodePos', type: 'text' },
                            { label: 'Telepon', name: 'telepon', type: 'text' },
                            { label: 'Email', name: 'email', type: 'email' },
                            { label: 'Website', name: 'website', type: 'text' },
                            { label: 'Kepala Sekolah', name: 'kepalaSekolah', type: 'text' },
                            { label: 'NIY Kepala Sekolah', name: 'niyKepalaSekolah', type: 'text' },
                        ].map((field) => (
                            <div key={field.name} className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>{field.label}</label>
                                <input type={field.type} name={field.name}
                                    value={formData[field.name as keyof typeof formData] as string}
                                    onChange={handleInputChange}
                                    placeholder={`Masukkan ${field.label.toLowerCase()}`}
                                    className={inputCls} />
                            </div>
                        ))}

                        {/* Alamat — full width */}
                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Alamat</label>
                            <textarea name="alamat" value={formData.alamat} onChange={handleInputChange}
                                rows={3} placeholder="Masukkan alamat lengkap sekolah"
                                className={inputCls} />
                        </div>
                    </div>

                    {/* ── Simpan ── */}
                    <div className="mt-2 pt-5" style={{ borderTop: '1px solid #fde0c8' }}>
                        {/* ✅ HAPUS checkbox konfirmasi */}

                        <div className="flex justify-end">
                            <button
                                onClick={openConfirmModal}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                    boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
                                }}
                                onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                            >
                                {isBusy ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {uploading ? 'Mengupload logo...' : 'Menyimpan...'}
                                    </>
                                ) : (
                                    'Simpan Perubahan'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ TAMBAHAN: Modal Konfirmasi Sederhana */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ animation: 'ds-fadeIn 0.2s ease' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
                        style={{ animation: 'ds-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi Perubahan Data
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            Apakah Anda yakin ingin menyimpan perubahan data sekolah ini?
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
                                    executeSubmit();
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
}