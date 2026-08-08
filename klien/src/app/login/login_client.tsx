/*
 * Nama File: login_client.tsx
 * Fungsi: Halaman login client-side (form, popup notifikasi, validasi, redirect)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';

// Konstanta konfigurasi API dan routing
const API_BASE_URL = 'http://localhost:5000';

const DASHBOARD_PATHS = {
    admin: '/admin/dashboard',
    guru_kelas: '/guru_kelas/dashboard',
    guru_bidang_studi: '/guru_bidang_studi/dashboard',
};

// Definisi tipe data untuk popup notifikasi
type PopupType = 'success' | 'error' | 'warning';

interface PopupConfig {
    type: PopupType;
    title: string;
    message: string;
    onClose?: () => void;
}

/* Komponen untuk menyuntikkan animasi global */
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes gk-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gk-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(0.625rem); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes gk-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes gk-shimmer { 0% { background-position: -12.5rem 0; } 100% { background-position: 12.5rem 0; } }
        
        .gk-fadeIn { animation: gk-fadeIn 0.2s ease; }
        .gk-scaleIn { animation: gk-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .gk-pulse { animation: gk-pulse 0.6s ease 0.15s; }
        .gk-shimmer { 
            background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%);
            background-size: 200% 100%;
            animation: gk-shimmer 1.5s infinite;
        }
    `}</style>
);

/* Komponen modal popup notifikasi login */
const LoginPopup = ({ popup, onClose }: { popup: PopupConfig; onClose: () => void }) => {
    const handleClose = () => {
        popup.onClose?.();
        onClose();
    };

    const cfg = {
        success: {
            bg: 'linear-gradient(135deg, #c95b08 0%, #e8690a 55%, #f5870a 100%)',
            iconBg: 'rgba(255,255,255,0.18)',
            iconBorder: 'rgba(255,255,255,0.35)',
            icon: (
                <svg width="2.75rem" height="2.75rem" viewBox="0 0 44 44" fill="none">
                    <circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.15)" />
                    <path d="M13 22l7 7 11-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            titleColor: '#fff',
            msgColor: 'rgba(255,237,213,0.92)',
            btnBg: 'rgba(255,255,255,0.22)',
            btnBorder: 'rgba(255,255,255,0.4)',
            btnColor: '#fff',
            btnHoverBg: 'rgba(255,255,255,0.32)',
            deco1: 'rgba(255,255,255,0.08)',
            deco2: 'rgba(255,255,255,0.05)',
        },
        error: {
            bg: 'linear-gradient(135deg, #991b1b 0%, #dc2626 55%, #ef4444 100%)',
            iconBg: 'rgba(255,255,255,0.15)',
            iconBorder: 'rgba(255,255,255,0.3)',
            icon: (
                <svg width="2.75rem" height="2.75rem" viewBox="0 0 44 44" fill="none">
                    <circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.12)" />
                    <path d="M15 15l14 14M29 15L15 29" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
            ),
            titleColor: '#fff',
            msgColor: 'rgba(254,226,226,0.9)',
            btnBg: 'rgba(255,255,255,0.18)',
            btnBorder: 'rgba(255,255,255,0.35)',
            btnColor: '#fff',
            btnHoverBg: 'rgba(255,255,255,0.28)',
            deco1: 'rgba(255,255,255,0.07)',
            deco2: 'rgba(255,255,255,0.04)',
        },
        warning: {
            bg: 'linear-gradient(135deg, #92400e 0%, #d97706 55%, #f59e0b 100%)',
            iconBg: 'rgba(255,255,255,0.15)',
            iconBorder: 'rgba(255,255,255,0.3)',
            icon: (
                <svg width="2.75rem" height="2.75rem" viewBox="0 0 44 44" fill="none">
                    <circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.12)" />
                    <path d="M22 14v10M22 28v2" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
            ),
            titleColor: '#fff',
            msgColor: 'rgba(254,243,199,0.9)',
            btnBg: 'rgba(255,255,255,0.18)',
            btnBorder: 'rgba(255,255,255,0.35)',
            btnColor: '#fff',
            btnHoverBg: 'rgba(255,255,255,0.28)',
            deco1: 'rgba(255,255,255,0.07)',
            deco2: 'rgba(255,255,255,0.04)',
        },
    }[popup.type];

    const label = popup.type === 'success' ? 'BERHASIL' : popup.type === 'error' ? 'GAGAL' : 'PERHATIAN';

    return (
        <>
            <style>{`
                @keyframes lp-backdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes lp-cardIn { from { opacity: 0; transform: scale(0.78) translateY(2rem); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes lp-iconPop { 0% { transform: scale(0.5) rotate(-12deg); opacity: 0; } 60% { transform: scale(1.18) rotate(4deg); opacity: 1; } 80% { transform: scale(0.94) rotate(-2deg); } 100% { transform: scale(1) rotate(0deg); } }
                @keyframes lp-shimmer { 0% { background-position: -12.5rem center; } 100% { background-position: 12.5rem center; } }
                @keyframes lp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
                
                .lp-backdrop { animation: lp-backdropIn 0.22s ease both; }
                .lp-card { animation: lp-cardIn 0.42s cubic-bezier(0.34, 1.45, 0.64, 1) both; }
                .lp-icon { animation: lp-iconPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both; }
                .lp-label-shimmer { 
                    background: linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.5) 100%); 
                    background-size: 200% auto; 
                    -webkit-background-clip: text; 
                    -webkit-text-fill-color: transparent; 
                    background-clip: text; 
                    animation: lp-shimmer 2.2s linear infinite; 
                }
                .lp-btn { transition: background 0.18s, transform 0.12s, box-shadow 0.18s; }
                .lp-btn:hover { transform: translateY(-0.0625rem); }
                .lp-btn:active { transform: scale(0.97); }
                .lp-deco1 { position: absolute; border-radius: 50%; top: -3rem; right: -3rem; width: 11.25rem; height: 11.25rem; pointer-events: none; }
                .lp-deco2 { position: absolute; border-radius: 50%; bottom: -2rem; left: -1.5rem; width: 8.75rem; height: 8.75rem; pointer-events: none; }
                ${popup.type === 'success' ? `.lp-dots { animation: lp-pulse 1.6s ease-in-out infinite; }` : ''}
            `}</style>

            <div
                className="lp-backdrop"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    background: 'rgba(12,5,2,0.62)',
                    backdropFilter: 'blur(0.375rem)',
                    WebkitBackdropFilter: 'blur(0.375rem)',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) handleClose();
                }}
            >
                <div
                    className="lp-card"
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '22.5rem',
                        borderRadius: '1.5rem',
                        overflow: 'hidden',
                        background: cfg.bg,
                        boxShadow: '0 2rem 5rem rgba(0,0,0,0.42), 0 0 0 0.0625rem rgba(255,255,255,0.1)',
                        padding: '2.75rem 2rem 2.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0,
                        textAlign: 'center',
                    }}
                >
                    <div className="lp-deco1" style={{ background: cfg.deco1 }} />
                    <div className="lp-deco2" style={{ background: cfg.deco2 }} />

                    <div
                        className="lp-icon"
                        style={{
                            width: '5rem',
                            height: '5rem',
                            borderRadius: '50%',
                            background: cfg.iconBg,
                            border: `0.156rem solid ${cfg.iconBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.25rem',
                            position: 'relative',
                            zIndex: 1,
                            flexShrink: 0,
                        }}
                    >
                        {cfg.icon}
                    </div>

                    <p
                        className="lp-label-shimmer"
                        style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            marginBottom: '0.5rem',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {label}
                    </p>

                    <h3
                        style={{
                            color: cfg.titleColor,
                            fontSize: '1.375rem',
                            fontWeight: 800,
                            lineHeight: 1.25,
                            margin: '0 0 0.625rem',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {popup.title}
                    </h3>

                    <div
                        style={{
                            width: '2.5rem',
                            height: '0.156rem',
                            background: 'rgba(255,255,255,0.35)',
                            borderRadius: '0.125rem',
                            margin: '0 0 0.875rem',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    />

                    <p
                        style={{
                            color: cfg.msgColor,
                            fontSize: '0.843rem',
                            lineHeight: 1.65,
                            margin: '0 0 1.75rem',
                            position: 'relative',
                            zIndex: 1,
                            fontWeight: 400,
                        }}
                    >
                        {popup.message}
                    </p>

                    {popup.type === 'success' && (
                        <div
                            className="lp-dots"
                            style={{
                                display: 'flex',
                                gap: '0.375rem',
                                marginBottom: '1.25rem',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '0.437rem',
                                        height: '0.437rem',
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.7)',
                                        animationDelay: `${i * 0.2}s`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {popup.type !== 'success' && (
                        <button
                            className="lp-btn"
                            onClick={handleClose}
                            style={{
                                width: '100%',
                                padding: '0.812rem 0',
                                borderRadius: '0.812rem',
                                border: `0.093rem solid ${cfg.btnBorder}`,
                                background: cfg.btnBg,
                                color: cfg.btnColor,
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                letterSpacing: '0.04em',
                                position: 'relative',
                                zIndex: 1,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = cfg.btnHoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = cfg.btnBg)}
                        >
                            Coba Lagi
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

/* Komponen modal konfirmasi logout */
const ConfirmLogoutModal = ({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 gk-fadeIn">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 gk-scaleIn"
            style={{ border: '0.0625rem solid #fde0c8' }}
        >
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size="1.125rem" />
            </button>

            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gk-pulse">
                <LogOut size="2rem" style={{ color: '#e8690a' }} />
            </div>

            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Logout</h3>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                    Apakah Anda yakin ingin keluar dari sistem?
                    <br />
                    Sesi Anda akan diakhiri.
                </p>
            </div>

            <div className="flex gap-3 w-full">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
                    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0e5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                    Batal
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all"
                    style={{
                        background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                        boxShadow: '0 0.187rem 0.75rem rgba(232,105,10,0.3)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                >
                    Ya
                </button>
            </div>
        </div>
    </div>
);

/* Komponen utama halaman login client-side */
export default function LoginClient() {
    const router = useRouter();

    const [formData, setFormData] = useState({ email_sekolah: '', password: '', role: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [namaSekolah, setNamaSekolah] = useState('Sekolah');
    const [logoSekolah, setLogoSekolah] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);

    const [popup, setPopup] = useState<PopupConfig | null>(null);
    const showPopup = useCallback((cfg: PopupConfig) => setPopup(cfg), []);
    const closePopup = useCallback(() => setPopup(null), []);

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Cek status login saat komponen dimuat
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (token && userData) {
            setShowLogoutConfirm(true);
        }
    }, []);

    // Proses logout
    const handleConfirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        setShowLogoutConfirm(false);
    };

    // Batalkan logout dan redirect ke dashboard
    const handleCancelLogout = () => {
        setShowLogoutConfirm(false);
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                const role = user.role;
                const dashboardPath = DASHBOARD_PATHS[role as keyof typeof DASHBOARD_PATHS] || '/';
                router.push(dashboardPath);
            }
        } catch (error) {
            console.error('Error redirecting to dashboard:', error);
        }
    };

    // Ambil data publik sekolah
    useEffect(() => {
        const fetchSekolah = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/sekolah/publik`);
                if (res.ok) {
                    const data = await res.json();
                    setNamaSekolah(data.nama_sekolah || 'Sekolah');
                    if (data.logo_path) {
                        setLogoSekolah(`${API_BASE_URL}${data.logo_path}`);
                    }
                }
            } catch {
                // Abaikan error fetching
            }
        };
        fetchSekolah();
    }, []);

    // Handle submit form login
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { email_sekolah, password, role } = formData;

        if (!email_sekolah.trim() || !password || !role) {
            showPopup({
                type: 'warning',
                title: 'Form Belum Lengkap',
                message: 'Email, password, dan role wajib diisi sebelum melanjutkan.',
            });
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_sekolah: email_sekolah.trim(), password, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                setLoading(false);

                const errorCode = data.code;
                const userRole = formData.role;
                const roleLabel =
                    userRole === 'admin'
                        ? 'Admin'
                        : userRole === 'guru_kelas'
                        ? 'Guru Kelas'
                        : 'Guru Bidang Studi';

                let title = 'Login Gagal';
                let message = 'Email atau password yang Anda masukkan salah. Silakan periksa kembali dan coba lagi.';

                if (errorCode === 'INVALID_CREDENTIALS') {
                    title = 'Login Gagal';
                    message = 'Email atau password yang Anda masukkan salah. Silakan periksa kembali dan coba lagi.';
                } else if (errorCode === 'ROLE_NOT_ALLOWED') {
                    title = 'Role Tidak Sesuai';
                    message = `Anda tidak memiliki akses sebagai ${roleLabel}. Silakan pilih role yang sesuai atau hubungi administrator.`;
                } else if (errorCode === 'ACCOUNT_INACTIVE') {
                    title = 'Akun Tidak Aktif';
                    message = 'Akun Anda tidak aktif. Silakan hubungi administrator untuk mengaktifkan akun.';
                }

                showPopup({ type: 'error', title, message });
                return;
            }

            if (data.user) {
                const userData = {
                    ...data.user,
                    role: role,
                    profileImage: data.user.profileImage || data.user.foto_path || null,
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('token', data.token);
                window.dispatchEvent(new Event('userDataUpdated'));
            }

            const roleLabel = role === 'admin' ? 'Admin' : role === 'guru_kelas' ? 'Wali Kelas' : 'Guru Bidang Studi';

            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            const defaultDashboard = DASHBOARD_PATHS[role as keyof typeof DASHBOARD_PATHS] || '/';
            const redirectPath = redirect || defaultDashboard;

            showPopup({
                type: 'success',
                title: 'Login Berhasil!',
                message: `Selamat datang kembali. Anda masuk sebagai ${roleLabel}. Mengalihkan ke dashboard...`,
            });

            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false);
            showPopup({
                type: 'error',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
            });
        }
    };

    // Handle perubahan input form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'email_sekolah' ? value.trim() : value,
        }));
    };

    return (
        <>
            <GlobalStyles />
            {popup && <LoginPopup popup={popup} onClose={closePopup} />}

            {showLogoutConfirm && (
                <ConfirmLogoutModal onConfirm={handleConfirmLogout} onCancel={handleCancelLogout} />
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,600;1,700&display=swap');
                
                * { 
                    font-family: 'Poppins', sans-serif; 
                    box-sizing: border-box; 
                }

                :root {
                    --ink: #2b1608;
                    --ink-soft: #7a4a26;
                    --muted: #b98a5e;
                    --bg-wash: #fdf6f0;
                    --border-soft: #fde0c8;
                    --grad-1: #c95b08;
                    --grad-2: #e8690a;
                    --grad-3: #f5870a;
                }

                /* Box Model & Layout */
                .bg-image { 
                    background-image: url('/images/bg-logo.jpg'); 
                    background-size: cover; 
                    background-position: center; 
                    background-repeat: no-repeat; 
                }
                .glass-overlay { 
                    background: rgba(253,246,240,0.6); 
                    backdrop-filter: blur(0.25rem); 
                    -webkit-backdrop-filter: blur(0.25rem); 
                }
                .login-card { 
                    display: flex; 
                    width: 100%; 
                    max-width: 56.25rem; 
                    min-height: 35rem; 
                    border-radius: 1.5rem; 
                    overflow: hidden; 
                    box-shadow: 0 1.5rem 4rem rgba(201,91,8,0.22), 0 0 0 0.0625rem rgba(253,224,200,0.6); 
                    background: #fff; 
                }
                .left-panel {
                    width: 42%;
                    background: linear-gradient(160deg, var(--grad-1) 0%, var(--grad-2) 55%, var(--grad-3) 100%);
                    padding: 3rem 2rem;
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center;
                    position: relative; 
                    overflow: hidden; 
                    gap: 1.625rem;
                }
                .right-panel { 
                    flex: 1; 
                    background: #fff; 
                    padding: 3rem 2.625rem; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center; 
                }
                .fg { margin-bottom: 1rem; }

                /* Visual & Decorations */
                .left-panel .ledger-lines {
                    position: absolute; 
                    inset: 0;
                    background-image: repeating-linear-gradient(to bottom, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 2.625rem);
                    opacity: 0.7; 
                    pointer-events: none;
                }
                .left-panel::before { 
                    content: ''; 
                    position: absolute; 
                    top: -3.75rem; 
                    right: -3.75rem; 
                    width: 12.5rem; 
                    height: 12.5rem; 
                    border-radius: 50%; 
                    background: rgba(255,255,255,0.1); 
                }
                .left-panel::after { 
                    content: ''; 
                    position: absolute; 
                    bottom: -2.5rem; 
                    left: 1.25rem; 
                    width: 8.75rem; 
                    height: 8.75rem; 
                    border-radius: 50%; 
                    background: rgba(255,255,255,0.07); 
                }
                .panel-shimmer {
                    position: absolute; 
                    top: -20%; 
                    left: -70%; 
                    width: 45%; 
                    height: 160%;
                    background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
                    transform: rotate(10deg);
                    animation: panel-shimmer-sweep 5.5s ease-in-out infinite;
                    pointer-events: none; 
                    z-index: 3; 
                    mix-blend-mode: soft-light;
                }
                @keyframes panel-shimmer-sweep {
                    0% { left: -70%; }
                    45% { left: 130%; }
                    100% { left: 130%; }
                }

                /* Typography & Components */
                .logo-orbit { 
                    position: relative; 
                    z-index: 1; 
                    width: 9.5rem; 
                    height: 9.5rem; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0; 
                    margin: 0 auto; 
                }
                .logo-orbit::before {
                    content: ''; 
                    position: absolute; 
                    inset: -0.5rem; 
                    border-radius: 50%;
                    border: 0.093rem dashed rgba(255,255,255,0.4);
                    animation: orbit-spin 18s linear infinite;
                }
                .logo-box { 
                    width: 8.25rem; 
                    height: 8.25rem; 
                    border-radius: 1.625rem; 
                    background: rgba(255,255,255,0.2); 
                    border: 0.156rem solid rgba(255,255,255,0.45); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 3.5rem; 
                    font-weight: 700; 
                    color: #fff; 
                    overflow: hidden; 
                }
                .logo-box img { width: 100%; height: 100%; object-fit: contain; }
                @keyframes orbit-spin { to { transform: rotate(360deg); } }

                .left-text { position: relative; z-index: 1; text-align: center; width: 100%; }
                .brand-erapor { 
                    font-size: 0.75rem; 
                    font-weight: 700; 
                    letter-spacing: 0.16em; 
                    text-transform: uppercase; 
                    color: rgba(255,255,255,0.85); 
                    margin: 0 0 0.375rem; 
                    line-height: 1.2; 
                }
                .brand-nama { 
                    font-size: 1.375rem; 
                    font-weight: 800; 
                    color: #fff; 
                    text-shadow: 0 0.125rem 0.625rem rgba(0,0,0,0.15); 
                    line-height: 1.3; 
                    margin: 0 0 0.625rem; 
                    word-break: break-word; 
                }
                .brand-sub { 
                    font-size: 0.718rem; 
                    color: rgba(255,255,255,0.75); 
                    font-weight: 400; 
                    line-height: 1.7; 
                    margin: 0; 
                }

                .right-header { text-align: center; margin: 0 auto 1.75rem; }
                .right-label { 
                    font-size: 0.687rem; 
                    font-weight: 700; 
                    letter-spacing: 0.14em; 
                    color: var(--grad-3); 
                    text-transform: uppercase; 
                    margin: 0 0 0.5rem; 
                }
                .right-title { 
                    font-size: 1.687rem; 
                    font-weight: 800; 
                    color: var(--ink); 
                    margin: 0 0 0.625rem; 
                }
                .right-divider { 
                    width: 2.25rem; 
                    height: 0.187rem; 
                    background: linear-gradient(90deg,var(--grad-1),var(--grad-3)); 
                    border-radius: 0.125rem; 
                    margin: 0 auto; 
                }

                .field-label { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.375rem; 
                    font-size: 0.687rem; 
                    font-weight: 600; 
                    letter-spacing: 0.08em; 
                    color: var(--ink-soft); 
                    text-transform: uppercase; 
                    margin: 0 0 0.437rem; 
                }

                .shimmer-field { position: relative; border-radius: 0.75rem; overflow: hidden; isolation: isolate; }
                .shimmer-field::after {
                    content: ''; 
                    position: absolute; 
                    top: 0; 
                    left: -10rem; 
                    width: 55%; 
                    height: 100%;
                    background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%);
                    transform: skewX(-22deg);
                    animation: shimmer-sweep 3.4s ease-in-out infinite;
                    pointer-events: none; 
                    z-index: 2; 
                    mix-blend-mode: soft-light;
                }
                .shimmer-field.shimmer-delay-1::after { animation-delay: 0.9s; }
                .shimmer-field.shimmer-delay-2::after { animation-delay: 1.8s; }
                @keyframes shimmer-sweep {
                    0% { left: -10rem; }
                    45% { left: 10rem; }
                    100% { left: 10rem; }
                }

                .field-input { 
                    position: relative; 
                    z-index: 1; 
                    width: 100%; 
                    height: 2.875rem; 
                    padding: 0 0.875rem; 
                    border-radius: 0.75rem; 
                    border: 0.093rem solid var(--border-soft); 
                    background: var(--bg-wash); 
                    font-size: 0.843rem; 
                    color: var(--ink); 
                    font-family: 'Poppins', sans-serif; 
                    outline: none; 
                    transition: border-color .18s, box-shadow .18s, background .18s; 
                }
                .field-input::placeholder { color: var(--muted); }
                .field-input:focus { 
                    border-color: var(--grad-3); 
                    box-shadow: 0 0 0 0.187rem rgba(245,135,10,0.14); 
                    background: #fff; 
                }
                input[type="password"]::-ms-reveal, input[type="password"]::-ms-clear { 
                    display: none !important; 
                    visibility: hidden; 
                    pointer-events: none; 
                }

                .pw-wrap { position: relative; }
                .pw-wrap .field-input { padding-right: 2.875rem; }
                .pw-toggle { 
                    position: absolute; 
                    right: 0.75rem; 
                    top: 50%; 
                    transform: translateY(-50%); 
                    background: none; 
                    border: none; 
                    cursor: pointer; 
                    padding: 0.25rem; 
                    color: var(--grad-3); 
                    opacity: 0.6; 
                    display: flex; 
                    align-items: center; 
                    transition: opacity .15s; 
                    z-index: 3; 
                }
                .pw-toggle:hover { opacity: 1; }

                .role-select { 
                    position: relative; 
                    z-index: 1; 
                    width: 100%; 
                    height: 2.875rem; 
                    padding: 0 2.75rem 0 0.875rem; 
                    border-radius: 0.75rem; 
                    border: 0.093rem solid var(--border-soft); 
                    background: var(--bg-wash); 
                    font-size: 0.843rem; 
                    font-family: 'Poppins', sans-serif; 
                    outline: none; 
                    cursor: pointer; 
                    transition: border-color .18s, box-shadow .18s, background .18s; 
                    appearance: none; 
                    -webkit-appearance: none; 
                    -moz-appearance: none; 
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23f5870a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); 
                    background-repeat: no-repeat; 
                    background-position: right 0.812rem center; 
                }
                .role-select:focus { 
                    border-color: var(--grad-3); 
                    box-shadow: 0 0 0 0.187rem rgba(245,135,10,0.14); 
                    background-color: #fff; 
                }
                .role-select option { color: var(--ink); background: #fff; }

                .btn-login { 
                    width: 100%; 
                    height: 3.125rem; 
                    border-radius: 0.875rem; 
                    border: none; 
                    cursor: pointer; 
                    background: linear-gradient(135deg,var(--grad-1),var(--grad-2),var(--grad-3)); 
                    color: #fff; 
                    font-family: 'Poppins', sans-serif; 
                    font-size: 0.906rem; 
                    font-weight: 700; 
                    letter-spacing: 0.06em; 
                    text-transform: uppercase; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.625rem; 
                    margin-top: 0.5rem; 
                    transition: transform .12s, box-shadow .18s, filter .18s; 
                    box-shadow: 0 0.375rem 1.25rem rgba(201,91,8,0.32); 
                }
                .btn-login:hover:not(:disabled) { 
                    transform: translateY(-0.125rem); 
                    box-shadow: 0 0.625rem 1.75rem rgba(201,91,8,0.42); 
                    filter: brightness(1.04); 
                }
                .btn-login:active:not(:disabled) { 
                    transform: translateY(0) scale(0.98); 
                }
                .btn-login:disabled { 
                    opacity: 0.6; 
                    cursor: not-allowed; 
                }
                .btn-login:focus-visible, .field-input:focus-visible, .role-select:focus-visible, .pw-toggle:focus-visible { 
                    outline: 0.125rem solid var(--grad-3); 
                    outline-offset: 0.125rem; 
                }
                .btn-arrow { 
                    width: 1.75rem; 
                    height: 1.75rem; 
                    border-radius: 0.562rem; 
                    background: rgba(255,255,255,0.2); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0; 
                    transition: transform .18s; 
                }
                .btn-login:hover:not(:disabled) .btn-arrow { 
                    transform: translateX(0.187rem); 
                }

                .footer-copy { 
                    text-align: center; 
                    font-size: 0.718rem; 
                    color: var(--muted); 
                    margin-top: 1.375rem; 
                }

                @media (prefers-reduced-motion: reduce) {
                    .logo-orbit::before { animation: none; }
                    .shimmer-field::after { animation: none; display: none; }
                    .panel-shimmer { animation: none; display: none; }
                }

                @media (max-width: 47.5rem) {
                    .login-card { flex-direction: column; max-width: 26.25rem; }
                    .left-panel { width: 100%; padding: 2.25rem 1.75rem; }
                    .right-panel { padding: 2.25rem 1.75rem; }
                }
            `}</style>

            <div className="min-h-screen relative bg-image">
                <div className="absolute inset-0 glass-overlay" />
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="login-card">
                        {/* Panel Kiri: Identitas Sekolah */}
                        <div className="left-panel">
                            <div className="ledger-lines" />
                            <div className="panel-shimmer" />
                            <div className="logo-orbit">
                                <div className="logo-box">
                                    {logoSekolah && !logoError ? (
                                        <img
                                            src={logoSekolah}
                                            alt={namaSekolah}
                                            onError={() => setLogoError(true)}
                                        />
                                    ) : (
                                        <span>{namaSekolah.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="left-text">
                                <p className="brand-erapor">E-Rapor</p>
                                <p className="brand-nama">{namaSekolah}</p>
                                <p className="brand-sub">
                                    Platform pengelolaan nilai dan
                                    <br />
                                    rapor siswa terintegrasi.
                                </p>
                            </div>
                        </div>

                        {/* Panel Kanan: Form Login */}
                        <div className="right-panel">
                            <div className="right-header">
                                <p className="right-label">Masuk ke akun</p>
                                <p className="right-title">Selamat Datang</p>
                                <div className="right-divider" />
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Email Field */}
                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="0.812rem" height="0.812rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                        Email
                                    </div>
                                    <div className="shimmer-field shimmer-delay-1">
                                        <input
                                            type="email"
                                            name="email_sekolah"
                                            value={formData.email_sekolah}
                                            onChange={handleChange}
                                            placeholder="Masukkan email Anda"
                                            className="field-input"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="0.812rem" height="0.812rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={2} />
                                            <path strokeWidth={2} d="M8 11V7a4 4 0 018 0v4" />
                                        </svg>
                                        Password
                                    </div>
                                    <div className="pw-wrap shimmer-field shimmer-delay-2">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Masukkan password Anda"
                                            className="field-input"
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="pw-toggle"
                                            onClick={() => setShowPassword((p) => !p)}
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                        >
                                            {showPassword ? (
                                                <svg width="1.062rem" height="1.062rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg width="1.062rem" height="1.062rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Role Select */}
                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="0.812rem" height="0.812rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        Role
                                    </div>
                                    <div className="shimmer-field">
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                            className="role-select"
                                            style={{ color: formData.role ? 'var(--ink)' : 'var(--muted)' }}
                                            required
                                        >
                                            <option value="" disabled>
                                                Pilih role Anda
                                            </option>
                                            <option value="admin">Admin</option>
                                            <option value="guru_kelas">Guru Kelas</option>
                                            <option value="guru_bidang_studi">Guru Bidang Studi</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button type="submit" disabled={loading} className="btn-login">
                                    {loading ? (
                                        <>
                                            <div
                                                style={{
                                                    width: '1.125rem',
                                                    height: '1.125rem',
                                                    borderRadius: '50%',
                                                    border: '0.156rem solid rgba(255,255,255,0.35)',
                                                    borderTopColor: '#fff',
                                                    animation: 'spin 0.7s linear infinite',
                                                }}
                                            />
                                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Login</span>
                                            <div className="btn-arrow">
                                                <svg width="0.875rem" height="0.875rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2.5}
                                                        d="M5 12h14M12 5l7 7-7 7"
                                                    />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="footer-copy">© 2026 {namaSekolah}. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}