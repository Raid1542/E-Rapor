/**
 * Nama File: login_client.tsx
 * ✅ UPDATED: 
 *   - Value select pakai underscore (sesuai database)
 *   - Hapus normalizeRole (tidak diperlukan)
 *   - Hard redirect pakai window.location
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type PopupType = 'success' | 'error' | 'warning';

interface PopupConfig {
    type: PopupType;
    title: string;
    message: string;
    onClose?: () => void;
}

// ─── LOGIN POPUP (TETAP SAMA) ─────────────────────────────────────────────────

const LoginPopup = ({ popup, onClose }: { popup: PopupConfig; onClose: () => void }) => {
    const handleClose = () => { popup.onClose?.(); onClose(); };

    const cfg = {
        success: {
            bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 55%, #fb923c 100%)',
            iconBg: 'rgba(255,255,255,0.18)',
            iconBorder: 'rgba(255,255,255,0.35)',
            icon: (
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
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
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
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
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
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
                @keyframes lp-cardIn {
                    from { opacity: 0; transform: scale(0.78) translateY(32px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
                @keyframes lp-iconPop {
                    0%   { transform: scale(0.5) rotate(-12deg); opacity: 0; }
                    60%  { transform: scale(1.18) rotate(4deg);  opacity: 1; }
                    80%  { transform: scale(0.94) rotate(-2deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes lp-shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes lp-pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.65; }
                }
                .lp-backdrop  { animation: lp-backdropIn 0.22s ease both; }
                .lp-card      { animation: lp-cardIn  0.42s cubic-bezier(0.34,1.45,0.64,1) both; }
                .lp-icon      { animation: lp-iconPop 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.12s both; }
                .lp-label-shimmer {
                    background: linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.5) 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: lp-shimmer 2.2s linear infinite;
                }
                .lp-btn {
                    transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
                }
                .lp-btn:hover  { transform: translateY(-1px); }
                .lp-btn:active { transform: scale(0.97); }
                .lp-deco1 {
                    position: absolute; border-radius: 50%;
                    top: -48px; right: -48px;
                    width: 180px; height: 180px;
                    pointer-events: none;
                }
                .lp-deco2 {
                    position: absolute; border-radius: 50%;
                    bottom: -32px; left: -24px;
                    width: 140px; height: 140px;
                    pointer-events: none;
                }
                ${popup.type === 'success' ? `.lp-dots { animation: lp-pulse 1.6s ease-in-out infinite; }` : ''}
            `}</style>

            <div
                className="lp-backdrop"
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px',
                    background: 'rgba(12,5,2,0.62)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                }}
                onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div
                    className="lp-card"
                    style={{
                        position: 'relative',
                        width: '100%', maxWidth: '360px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        background: cfg.bg,
                        boxShadow: '0 32px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.1)',
                        padding: '44px 32px 36px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
                        textAlign: 'center',
                    }}
                >
                    <div className="lp-deco1" style={{ background: cfg.deco1 }} />
                    <div className="lp-deco2" style={{ background: cfg.deco2 }} />

                    <div
                        className="lp-icon"
                        style={{
                            width: 80, height: 80,
                            borderRadius: '50%',
                            background: cfg.iconBg,
                            border: `2.5px solid ${cfg.iconBorder}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px',
                            position: 'relative', zIndex: 1,
                            flexShrink: 0,
                        }}
                    >
                        {cfg.icon}
                    </div>

                    <p
                        className="lp-label-shimmer"
                        style={{
                            fontSize: '10px', fontWeight: 700,
                            letterSpacing: '0.18em',
                            marginBottom: '8px',
                            position: 'relative', zIndex: 1,
                        }}
                    >
                        {label}
                    </p>

                    <h3
                        style={{
                            color: cfg.titleColor,
                            fontSize: '22px', fontWeight: 800,
                            lineHeight: 1.25,
                            margin: '0 0 10px',
                            position: 'relative', zIndex: 1,
                        }}
                    >
                        {popup.title}
                    </h3>

                    <div style={{
                        width: 40, height: 2.5,
                        background: 'rgba(255,255,255,0.35)',
                        borderRadius: 2,
                        margin: '0 0 14px',
                        position: 'relative', zIndex: 1,
                    }} />

                    <p
                        style={{
                            color: cfg.msgColor,
                            fontSize: '13.5px', lineHeight: 1.65,
                            margin: '0 0 28px',
                            position: 'relative', zIndex: 1,
                            fontWeight: 400,
                        }}
                    >
                        {popup.message}
                    </p>

                    {popup.type === 'success' && (
                        <div className="lp-dots" style={{
                            display: 'flex', gap: 6, marginBottom: 20,
                            position: 'relative', zIndex: 1,
                        }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.7)',
                                    animationDelay: `${i * 0.2}s`,
                                }} />
                            ))}
                        </div>
                    )}

                    {popup.type !== 'success' && (
                        <button
                            className="lp-btn"
                            onClick={handleClose}
                            style={{
                                width: '100%',
                                padding: '13px 0',
                                borderRadius: '13px',
                                border: `1.5px solid ${cfg.btnBorder}`,
                                background: cfg.btnBg,
                                color: cfg.btnColor,
                                fontSize: '14px', fontWeight: 700,
                                cursor: 'pointer',
                                letterSpacing: '0.04em',
                                position: 'relative', zIndex: 1,
                                fontFamily: 'Poppins, sans-serif',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = cfg.btnHoverBg)}
                            onMouseLeave={e => (e.currentTarget.style.background = cfg.btnBg)}
                        >
                            Coba Lagi
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function LoginClient() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        email_sekolah: "",
        password: "",
        role: "",
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [namaSekolah, setNamaSekolah] = useState("Sekolah");
    const [logoSekolah, setLogoSekolah] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);

    const [popup, setPopup] = useState<PopupConfig | null>(null);
    const showPopup = useCallback((cfg: PopupConfig) => setPopup(cfg), []);
    const closePopup = useCallback(() => setPopup(null), []);

    useEffect(() => {
        const fetchSekolah = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/sekolah/publik");
                if (res.ok) {
                    const data = await res.json();
                    setNamaSekolah(data.nama_sekolah || "Sekolah");
                    if (data.logo_path) setLogoSekolah(`http://localhost:5000${data.logo_path}`);
                }
            } catch { /* abaikan */ }
        };
        fetchSekolah();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { email_sekolah, password, role } = formData;

        console.log('🔐 [Login] Attempting login...', { email_sekolah, role });

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
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_sekolah: email_sekolah.trim(), password, role }),
            });

            const data = await res.json();
            console.log('📥 [Login] Response:', { status: res.status, data });

            if (!res.ok) {
                setLoading(false);

                const msg = data.message || "Login gagal";
                const isWrongPass = msg.toLowerCase().includes('password') || msg.toLowerCase().includes('sandi') || res.status === 401;
                const isNotFound = msg.toLowerCase().includes('tidak ditemukan') || msg.toLowerCase().includes('not found') || res.status === 404;
                const isRoleErr = msg.toLowerCase().includes('role') || msg.toLowerCase().includes('akses');

                showPopup({
                    type: 'error',
                    title: isWrongPass ? 'Password Salah'
                        : isNotFound ? 'Akun Tidak Ditemukan'
                            : isRoleErr ? 'Role Tidak Sesuai'
                                : 'Login Gagal',
                    message: isWrongPass
                        ? 'Password yang Anda masukkan tidak sesuai. Periksa kembali dan coba lagi.'
                        : isNotFound
                            ? 'Email yang Anda masukkan tidak terdaftar. Periksa kembali.'
                            : isRoleErr
                                ? 'Anda tidak memiliki akses untuk role yang dipilih.'
                                : msg,
                });
                return;
            }

            // ✅ LANGSUNG PAKAI role (tidak perlu normalisasi)
            console.log('✅ [Login] Role:', role);

            // Simpan data user
            if (data.user) {
                const userData = {
                    ...data.user,
                    role: role,  // ✅ Langsung pakai, tidak perlu normalisasi
                    profileImage: data.user.profileImage || data.user.foto_path || null,
                };
                localStorage.setItem("currentUser", JSON.stringify(userData));
                localStorage.setItem("token", data.token);
                window.dispatchEvent(new Event("userDataUpdated"));

                console.log('💾 [Login] User data saved');
                console.log('🔑 Token:', data.token.substring(0, 50) + '...');
            }

            const roleLabel = role === 'admin' ? 'Admin'
                : role === 'guru_kelas' ? 'Wali Kelas'
                    : 'Guru Bidang Studi';

            // Ambil redirect parameter
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');

            const defaultDashboard = role === "admin"
                ? "/admin/dashboard"
                : role === "guru_kelas"
                    ? "/guru_kelas/dashboard"
                    : "/guru_bidang_studi/dashboard";

            const redirectPath = redirect || defaultDashboard;
            console.log('🎯 [Login] Will redirect to:', redirectPath);

            // Tampilkan popup sukses
            showPopup({
                type: 'success',
                title: 'Login Berhasil!',
                message: `Selamat datang kembali. Anda masuk sebagai ${roleLabel}. Mengalihkan ke dashboard...`,
            });

            // ✅ HARD REDIRECT
            setTimeout(() => {
                console.log('🚀 [Login] HARD REDIRECT to:', redirectPath);
                console.log('🚀 [Login] Token saved:', !!localStorage.getItem('token'));
                console.log('🚀 [Login] User saved:', localStorage.getItem('currentUser'));
                window.location.href = redirectPath;
            }, 1500);

        } catch (error) {
            console.error('❌ [Login] Error:', error);
            setLoading(false);
            showPopup({
                type: 'error',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === "email_sekolah" ? value.trim() : value }));
    };

    return (
        <>
            {popup && <LoginPopup popup={popup} onClose={closePopup} />}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,600;1,700&display=swap');
                * { font-family: 'Poppins', sans-serif; box-sizing: border-box; }

                .bg-image {
                    background-image: url('/images/bg-logo.jpg');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                }
                .glass-overlay {
                    background: rgba(255,255,255,0.52);
                    backdrop-filter: blur(3px);
                    -webkit-backdrop-filter: blur(3px);
                }
                .login-card {
                    display: flex;
                    width: 100%;
                    max-width: 860px;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 12px 48px rgba(234,88,12,0.18);
                }

                .left-panel {
                    width: 42%;
                    background: linear-gradient(160deg, #ea580c 0%, #f97316 55%, #fb923c 100%);
                    padding: 48px 32px;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    position: relative; overflow: hidden; gap: 26px;
                }
                .left-panel::before {
                    content: '';
                    position: absolute; top: -60px; right: -60px;
                    width: 200px; height: 200px; border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                }
                .left-panel::after {
                    content: '';
                    position: absolute; bottom: -40px; left: 20px;
                    width: 140px; height: 140px; border-radius: 50%;
                    background: rgba(255,255,255,0.07);
                }
                .logo-box {
                    width: 148px; height: 148px;
                    border-radius: 26px;
                    background: rgba(255,255,255,0.22);
                    border: 2.5px solid rgba(255,255,255,0.45);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 60px; font-weight: 700; color: #fff;
                    position: relative; z-index: 1; overflow: hidden;
                    flex-shrink: 0; margin: 0 auto;
                }
                .logo-box img { width: 100%; height: 100%; object-fit: contain; }
                .left-text { position: relative; z-index: 1; text-align: center; width: 100%; }
                .brand-erapor { font-size: 22px; font-weight: 600; color: #fff; letter-spacing: -0.3px; margin: 0 0 2px; line-height: 1.2; }
                .brand-nama   { font-size: 20px; font-weight: 700; font-style: italic; color: #c2410c; text-shadow: 0 1px 8px rgba(0,0,0,0.18); line-height: 1.3; margin: 0 0 8px; word-break: break-word; }
                .brand-sub    { font-size: 11.5px; color: rgba(255,255,255,0.7); font-weight: 400; line-height: 1.6; margin: 0; }

                .right-panel { flex: 1; background: #fff; padding: 44px 38px; display: flex; flex-direction: column; justify-content: center; }
                .right-label  { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; color: #f97316; text-transform: uppercase; margin: 0 0 8px; }
                .right-title  { font-size: 28px; font-weight: 700; color: #1c0f07; margin: 0 0 8px; }
                .right-divider { width: 36px; height: 3px; background: linear-gradient(90deg,#ea580c,#fb923c); border-radius: 2px; margin: 0 0 24px; }

                .field-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #9a3412; text-transform: uppercase; margin: 0 0 7px; }
                .field-input {
                    width: 100%; height: 46px; padding: 0 14px;
                    border-radius: 11px; border: 1.5px solid rgba(251,146,60,0.3);
                    background: #fff8f2; font-size: 13.5px; color: #1c0f07;
                    font-family: 'Poppins', sans-serif; outline: none;
                    transition: border-color .18s, box-shadow .18s, background .18s;
                }
                .field-input::placeholder { color: #c4a882; }
                .field-input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.13); background: #fff; }

                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear { display: none !important; visibility: hidden; pointer-events: none; }

                .pw-wrap { position: relative; }
                .pw-wrap .field-input { padding-right: 46px; }
                .pw-toggle {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    background: none; border: none; cursor: pointer; padding: 4px;
                    color: #f97316; opacity: 0.6; display: flex; align-items: center;
                }
                .pw-toggle:hover { opacity: 1; }

                .role-select {
                    width: 100%; height: 46px; padding: 0 44px 0 14px;
                    border-radius: 11px; border: 1.5px solid rgba(251,146,60,0.3);
                    background: #fff8f2; font-size: 13.5px; font-family: 'Poppins', sans-serif;
                    outline: none; cursor: pointer; transition: border-color .18s, box-shadow .18s, background .18s;
                    appearance: none; -webkit-appearance: none; -moz-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23f97316' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 13px center; background-color: #fff8f2;
                }
                .role-select:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.13); background-color: #fff; }
                .role-select option { color: #1c0f07; background: #fff; }

                .btn-login {
                    width: 100%; height: 50px; border-radius: 13px; border: none; cursor: pointer;
                    background: linear-gradient(135deg,#ea580c,#f97316,#fb923c);
                    color: #fff; font-family: 'Poppins', sans-serif; font-size: 14.5px;
                    font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    margin-top: 6px; transition: background .18s, transform .12s, box-shadow .18s;
                    box-shadow: 0 4px 18px rgba(234,88,12,0.32);
                }
                .btn-login:hover:not(:disabled) { background: linear-gradient(135deg,#c2410c,#ea580c,#f97316); box-shadow: 0 6px 24px rgba(234,88,12,0.42); }
                .btn-login:active { transform: scale(0.98); }
                .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-arrow { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .fg { margin-bottom: 16px; }
                .footer-copy { text-align: center; font-size: 11.5px; color: #c2410c; margin-top: 20px; opacity: 0.8; }
            `}</style>

            <div className="min-h-screen relative bg-image">
                <div className="absolute inset-0 glass-overlay" />
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="login-card">

                        <div className="left-panel">
                            <div className="logo-box">
                                {logoSekolah && !logoError ? (
                                    <img src={logoSekolah} alt={namaSekolah} onError={() => setLogoError(true)} />
                                ) : (
                                    <span>{namaSekolah.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="left-text">
                                <p className="brand-erapor">E-Rapor</p>
                                <p className="brand-nama">{namaSekolah}</p>
                                <p className="brand-sub">
                                    Platform pengelolaan nilai dan<br />rapor siswa terintegrasi.
                                </p>
                            </div>
                        </div>

                        <div className="right-panel">
                            <p className="right-label">Masuk ke akun</p>
                            <p className="right-title">Selamat Datang</p>
                            <div className="right-divider" />

                            <form onSubmit={handleSubmit}>

                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Email
                                    </div>
                                    <input
                                        type="email" name="email_sekolah"
                                        value={formData.email_sekolah} onChange={handleChange}
                                        placeholder="Masukkan email Anda"
                                        className="field-input" required
                                    />
                                </div>

                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={2} />
                                            <path strokeWidth={2} d="M8 11V7a4 4 0 018 0v4" />
                                        </svg>
                                        Password
                                    </div>
                                    <div className="pw-wrap">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password" value={formData.password} onChange={handleChange}
                                            placeholder="Masukkan password Anda"
                                            className="field-input" autoComplete="current-password" required
                                        />
                                        <button type="button" className="pw-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                                            {showPassword ? (
                                                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Role
                                    </div>
                                    <select name="role" value={formData.role} onChange={handleChange}
                                        className="role-select"
                                        style={{ color: formData.role ? "#1c0f07" : "#c4a882" }}
                                        required>
                                        <option value="" disabled style={{ color: "#c4a882" }}>Pilih role Anda</option>
                                        {/* ✅ UBAH: Pakai underscore sesuai database */}
                                        <option value="admin">Admin</option>
                                        <option value="guru_kelas">Guru Kelas</option>
                                        <option value="guru_bidang_studi">Guru Bidang Studi</option>
                                    </select>
                                </div>

                                <button type="submit" disabled={loading} className="btn-login">
                                    {loading ? (
                                        <>
                                            <div style={{
                                                width: 18, height: 18, borderRadius: '50%',
                                                border: '2.5px solid rgba(255,255,255,0.35)',
                                                borderTopColor: '#fff',
                                                animation: 'spin 0.7s linear infinite',
                                            }} />
                                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Login</span>
                                            <div className="btn-arrow">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="footer-copy">© 2025 {namaSekolah}. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}