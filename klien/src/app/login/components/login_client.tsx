/**
 * Nama File: login_client.tsx
 * Fungsi: Komponen klien untuk halaman login E-Rapor.
 *         Menangani formulir login, validasi input, komunikasi API,
 *         dan navigasi berdasarkan role pengguna.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginClient() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email_sekolah: "",
        password: "",
        role: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [namaSekolah, setNamaSekolah] = useState("Sekolah");
    const [logoSekolah, setLogoSekolah] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);

    // Ambil data publik sekolah saat komponen dimuat
    useEffect(() => {
        const fetchSekolah = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/sekolah/publik");
                if (res.ok) {
                    const data = await res.json();
                    setNamaSekolah(data.nama_sekolah || "Sekolah");
                    if (data.logo_path) {
                        setLogoSekolah(`http://localhost:5000${data.logo_path}`);
                    }
                }
            } catch (err) {
                console.warn("Gagal memuat data sekolah publik");
            }
        };
        fetchSekolah();
    }, []);

    // Tangani submit formulir login
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const { email_sekolah, password, role } = formData;

        if (!email_sekolah.trim() || !password || !role) {
            setError("Email, password, dan role wajib diisi");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email_sekolah: email_sekolah.trim(),
                    password,
                    role,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Login gagal");
                setLoading(false);
                return;
            }

            // Simpan data pengguna dan token ke localStorage
            if (data.user) {
                const normalizedUser = {
                    ...data.user,
                    role: formData.role,
                    profileImage: data.user.profileImage || data.user.foto_path || null,
                };
                localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
                localStorage.setItem("token", data.token);
                window.dispatchEvent(new Event("userDataUpdated"));
            }

            // Arahkan ke dashboard berdasarkan role
            if (role === "admin") {
                router.push("/admin/dashboard");
            } else if (role === "guru kelas") {
                router.push("/guru_kelas/dashboard");
            } else if (role === "guru bidang studi") {
                router.push("/guru_bidang_studi/dashboard");
            }
        } catch (err) {
            console.error("Error koneksi:", err);
            setError("Gagal terhubung ke server. Silakan coba lagi");
            setLoading(false);
        }
    };

    // Tangani perubahan input form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const trimmedValue = name === "email_sekolah" ? value.trim() : value;
        setFormData((prev) => ({ ...prev, [name]: trimmedValue }));
    };

    return (
        <>
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
          background: rgba(255, 255, 255, 0.52);
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

        /* ── Panel Kiri ── */
        .left-panel {
          width: 42%;
          background: linear-gradient(160deg, #ea580c 0%, #f97316 55%, #fb923c 100%);
          padding: 48px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          gap: 26px;
        }
        .left-panel::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -40px; left: 20px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }

        /* Logo besar, tengah */
        .logo-box {
          width: 148px;
          height: 148px;
          border-radius: 26px;
          background: rgba(255,255,255,0.22);
          border: 2.5px solid rgba(255,255,255,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          font-weight: 700;
          color: #fff;
          position: relative;
          z-index: 1;
          overflow: hidden;
          flex-shrink: 0;
          margin: 0 auto;
        }
        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .left-text {
          position: relative;
          z-index: 1;
          text-align: center;
          width: 100%;
        }

        /* "E-Rapor" — putih solid */
        .brand-erapor {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.3px;
          margin: 0 0 2px;
          line-height: 1.2;
        }

        /* Nama sekolah — kuning cerah seperti aksen di code lama */
        .brand-nama {
          font-size: 20px;
          font-weight: 700;
          font-style: italic;
          color: #c2410c;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.18);
          line-height: 1.3;
          margin: 0 0 8px;
          word-break: break-word;
        }

        .brand-sub {
          font-size: 11.5px;
          color: rgba(255,255,255,0.7);
          font-weight: 400;
          line-height: 1.6;
          margin: 0;
        }

        /* ── Panel Kanan ── */
        .right-panel {
          flex: 1;
          background: #ffffff;
          padding: 44px 38px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .right-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #f97316;
          text-transform: uppercase;
          margin: 0 0 8px;
        }
        .right-title {
          font-size: 28px;
          font-weight: 700;
          color: #1c0f07;
          margin: 0 0 8px;
        }
        .right-divider {
          width: 36px;
          height: 3px;
          background: linear-gradient(90deg, #ea580c, #fb923c);
          border-radius: 2px;
          margin: 0 0 24px;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #9a3412;
          text-transform: uppercase;
          margin: 0 0 7px;
        }
        .field-input {
          width: 100%;
          height: 46px;
          padding: 0 14px;
          border-radius: 11px;
          border: 1.5px solid rgba(251,146,60,0.3);
          background: #fff8f2;
          font-size: 13.5px;
          color: #1c0f07;
          font-family: 'Poppins', sans-serif;
          outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }
        .field-input::placeholder { color: #c4a882; }
        .field-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.13);
          background: #fff;
        }

        /* Sembunyikan reveal icon bawaan browser */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear,
        input[type="password"]::-webkit-contacts-auto-fill-button,
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
          visibility: hidden;
          pointer-events: none;
        }

        .pw-wrap { position: relative; }
        .pw-wrap .field-input { padding-right: 46px; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #f97316;
          opacity: 0.6;
          display: flex;
          align-items: center;
        }
        .pw-toggle:hover { opacity: 1; }

        .role-select {
          width: 100%;
          height: 46px;
          padding: 0 44px 0 14px;
          border-radius: 11px;
          border: 1.5px solid rgba(251,146,60,0.3);
          background: #fff8f2;
          font-size: 13.5px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          cursor: pointer;
          transition: border-color .18s, box-shadow .18s, background .18s;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23f97316' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 13px center;
          background-color: #fff8f2;
        }
        .role-select:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.13);
          background-color: #fff;
        }
        .role-select option { color: #1c0f07; background: #fff; }

        .btn-login {
          width: 100%;
          height: 50px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #ea580c, #f97316, #fb923c);
          color: #fff;
          font-family: 'Poppins', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 6px;
          transition: background .18s, transform .12s, box-shadow .18s;
          box-shadow: 0 4px 18px rgba(234,88,12,0.32);
        }
        .btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #c2410c, #ea580c, #f97316);
          box-shadow: 0 6px 24px rgba(234,88,12,0.42);
        }
        .btn-login:active { transform: scale(0.98); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-arrow {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fg { margin-bottom: 16px; }
        .footer-copy {
          text-align: center;
          font-size: 11.5px;
          color: #c2410c;
          margin-top: 20px;
          opacity: 0.8;
        }
      `}</style>

            <div className="min-h-screen relative bg-image">
                <div className="absolute inset-0 glass-overlay"></div>
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="login-card">

                        {/* ── Panel Kiri ── */}
                        <div className="left-panel">

                            {/* Logo besar, tengah */}
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

                            {/* Teks nama sekolah */}
                            <div className="left-text">
                                <p className="brand-erapor">E-Rapor</p>
                                <p className="brand-nama">{namaSekolah}</p>
                                <p className="brand-sub">
                                    Platform pengelolaan nilai dan<br />
                                    rapor siswa terintegrasi.
                                </p>
                            </div>
                        </div>

                        {/* ── Panel Kanan ── */}
                        <div className="right-panel">
                            <p className="right-label">Masuk ke akun</p>
                            <p className="right-title">Selamat Datang</p>
                            <div className="right-divider"></div>

                            {/* Pesan Error */}
                            {error && (
                                <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                                    style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <path strokeWidth="2" d="M12 8v4m0 4h.01" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>

                                {/* Email */}
                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Email
                                    </div>
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

                                {/* Password */}
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
                                        >
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

                                {/* Role */}
                                <div className="fg">
                                    <div className="field-label">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Role
                                    </div>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="role-select"
                                        style={{ color: formData.role ? "#1c0f07" : "#c4a882" }}
                                        required
                                    >
                                        <option value="" disabled style={{ color: "#c4a882" }}>Pilih role Anda</option>
                                        <option value="admin">Admin</option>
                                        <option value="guru kelas">Guru Kelas</option>
                                        <option value="guru bidang studi">Guru Bidang Studi</option>
                                    </select>
                                </div>

                                <button type="submit" disabled={loading} className="btn-login">
                                    <span>{loading ? "Loading..." : "Login"}</span>
                                    {!loading && (
                                        <div className="btn-arrow">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            </form>

                            <p className="footer-copy">
                                © 2025 {namaSekolah}. All rights reserved.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}