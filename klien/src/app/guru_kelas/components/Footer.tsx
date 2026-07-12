'use client';

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