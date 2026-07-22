/*
 * Nama File: Footer.tsx
 * Fungsi: Komponen footer untuk halaman admin dengan copyright dinamis
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

'use client';

/* Komponen Footer dengan gradient orange dan tahun copyright dinamis */
const Footer = () => {
    const tahun = new Date().getFullYear();

    return (
        <footer
            className="w-full py-3 text-center text-xs text-white/90"
            style={{
                background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
            }}
        >
            &copy; {tahun} e-Rapor SDIT Ulil Albab Batam. All Rights Reserved.
        </footer>
    );
};

export default Footer;