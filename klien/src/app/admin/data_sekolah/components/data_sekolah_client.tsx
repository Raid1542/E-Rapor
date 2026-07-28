/**
 * Nama File: data_sekolah_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data profil sekolah oleh admin.
 *         Memungkinkan pengeditan informasi dasar sekolah (nama, NPSN, alamat, dsb.)
 *         dan pengunggahan logo sekolah. Data disimpan ke backend melalui API PUT,
 *         sedangkan logo diupload via FormData ke endpoint khusus.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Update: Menyamakan tampilan (warna, bentuk tombol, kartu) dengan
 *         data_guru_client.tsx / data_pembina_ekskul_client.tsx / data_kelas_client.tsx /
 *         data_tahun_ajaran_client.tsx. Hanya lapisan UI yang diubah — semua logika,
 *         state, dan pemanggilan API tetap sama persis seperti sebelumnya.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, WifiOff, ShieldAlert, X, Upload, ImageOff } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
// Disamakan dengan data_guru_client.tsx / data_pembina_ekskul_client.tsx /
// data_kelas_client.tsx / data_tahun_ajaran_client.tsx.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────

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

        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible, label:focus-within {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        /* ── Logo preview: sedikit pulse pas ganti gambar ── */
        .logo-pop { animation: dg-scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .btn-action, .card-flat, .logo-pop {
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
    onClick, children, variant = 'neutral', disabled = false, fullWidth = false,
}: {
    onClick?: () => void; children: React.ReactNode; variant?: BtnVariant;
    disabled?: boolean; fullWidth?: boolean;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`btn-action inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap px-5 py-2.5 text-sm ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={VARIANT_BASE[variant]}
    >
        {children}
    </button>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <X size={18} />
                    </button>
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                        {s.icon}
                    </div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                        OK, Mengerti
                    </button>
                </div>
            </div>
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

    // State untuk modal konfirmasi
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

    // Buka modal konfirmasi
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

    // Eksekusi submit (setelah konfirmasi)
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
                    <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data sekolah...</p>
                </div>
            </div>
        );
    }

    const isBusy = saving || uploading;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6 flex flex-col items-center" style={PAGE_BG}>
            <GlobalStyles />

            {/* Notif modal */}
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Page header */}
            <div className="w-full max-w-3xl mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Sekolah</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola informasi dan logo sekolah</p>
            </div>

            {/* Card */}
            <div className="card-flat w-full max-w-3xl bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>

                {/* Card header */}
                <div className="px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                    <h2 className="text-sm sm:text-base font-bold text-white">Informasi Sekolah</h2>
                    <p className="text-xs text-white/75 mt-0.5">Lengkapi semua informasi sekolah dengan benar</p>
                </div>

                <div className="p-4 sm:p-6 md:p-8">

                    {/* ── Logo section ── */}
                    <div className="flex flex-col items-center mb-8">

                        {/* Preview bulat */}
                        <div
                            key={logoPreview ?? 'empty'}
                            className="logo-pop w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center overflow-hidden mb-4"
                            style={{ border: '3px dashed #fde0c8', background: '#fffaf6' }}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview Logo Sekolah"
                                    className="w-full h-full object-contain p-2"
                                    onError={() => setLogoPreview(null)} />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <ImageOff size={30} className="mb-1" style={{ color: '#f5a623' }} />
                                    <span className="text-[10px] font-bold" style={{ color: ACCENT_DARK }}>Belum ada logo</span>
                                </div>
                            )}
                        </div>

                        {/* Nama sekolah di bawah logo */}
                        {formData.namaSekolah && (
                            <p className="text-sm font-bold text-gray-700 mb-3 text-center">{formData.namaSekolah}</p>
                        )}

                        {/* Tombol pilih file */}
                        <label
                            className="btn-action flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all"
                            style={{ background: '#fff5eb', border: '1.5px solid #f0a94e', color: ACCENT_DARK }}
                        >
                            <Upload size={14} />
                            {selectedFile ? selectedFile.name : 'Pilih Logo Baru'}
                            <input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/jpg"
                                onChange={handleLogoChange} className="hidden" />
                        </label>
                        <p className="text-[11px] mt-1.5 text-gray-400 font-medium">JPG, JPEG, PNG · maks. 2 MB</p>
                    </div>

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px" style={{ background: '#f0f0f0' }} />
                        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: ACCENT_DARK }}>Informasi Umum</span>
                        <div className="flex-1 h-px" style={{ background: '#f0f0f0' }} />
                    </div>

                    {/* ── Form fields ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">

                        {/* Nama Sekolah — full width */}
                        <div className="sm:col-span-2 flex flex-col gap-1">
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
                            <div key={field.name} className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>{field.label}</label>
                                <input type={field.type} name={field.name}
                                    value={formData[field.name as keyof typeof formData] as string}
                                    onChange={handleInputChange}
                                    placeholder={`Masukkan ${field.label.toLowerCase()}`}
                                    className={inputCls} />
                            </div>
                        ))}

                        {/* Alamat — full width */}
                        <div className="sm:col-span-2 flex flex-col gap-1">
                            <label className={labelCls} style={labelColor}>Alamat</label>
                            <textarea name="alamat" value={formData.alamat} onChange={handleInputChange}
                                rows={3} placeholder="Masukkan alamat lengkap sekolah"
                                className={inputCls} />
                        </div>
                    </div>

                    {/* ── Simpan ── */}
                    <div className="mt-4 pt-5 border-t" style={{ borderColor: '#f0e0d0' }}>
                        <div className="flex justify-end">
                            <ActionButton variant="primary" disabled={isBusy} onClick={openConfirmModal}>
                                {isBusy ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        {uploading ? 'Mengupload logo...' : 'Menyimpan...'}
                                    </>
                                ) : (
                                    'Simpan Perubahan'
                                )}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi */}
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
                                Konfirmasi Perubahan Data
                            </h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-5">
                            Apakah Anda yakin ingin menyimpan perubahan data sekolah ini?
                        </p>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmModal(false); executeSubmit(); }}>
                                Simpan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}