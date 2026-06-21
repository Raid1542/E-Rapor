/**
 * Nama File: kokurikuler_client.tsx
 * Fungsi: Input nilai kokurikuler siswa untuk guru kelas
 * 
 * RULES:
 * - PTS Aktif: Hanya Mutaba'ah yang bisa diinput
 * - PAS Aktif: Semua aspek bisa diinput + Judul Proyek bisa diatur
 * - Belum Aktif: Tidak ada yang bisa diinput
 * 
 * VALIDASI:
 * - Nilai 0-100 (real-time)
 * - Nilai harus integer
 * - Semua aspek wajib terisi
 * - Judul proyek max 255 karakter
 * - Session expired handling
 * - Network timeout handling
 */

'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, LogOut, Lock, BookOpen, Award, Save, Unlock, Calendar } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface GradeConfig {
  id_kategori_grade_kokurikuler: number;
  id_aspek_kokurikuler: number;
  rentang_min: number;
  rentang_max: number;
  min_nilai?: number;
  max_nilai?: number;
  grade: string;
  deskripsi: string;
}

interface NilaiAspek {
  nilai: number | null;
  grade: string | null;
  deskripsi: string | null;
}

interface SiswaKokurikuler {
  id: number;
  nama: string;
  nis: string;
  nisn: string;
  nilai: Record<number, NilaiAspek>;
}

interface JudulProyek {
  id_judul_proyek: number | null;
  judul: string;
  deskripsi: string | null;
}

// Mapping ID aspek (sesuai database)
const ASPEK_ID = {
  bpi: 2,
  proyek: 3,
  literasi: 4,
  mutabaah: 5,
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .dg-fadeIn  { animation: dg-fadeIn  0.2s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .dg-pulse   { animation: dg-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
  error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dg-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
      </div>
    </div>
  );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputDisabledCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-400 outline-none bg-gray-100 border-gray-200 cursor-not-allowed";

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const BtnSecondary = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => { if (!disabled) (e.currentTarget.style.background = '#fff0e5'); }}
    onMouseLeave={e => { if (!disabled) (e.currentTarget.style.background = '#fff'); }}
  >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function KokurikulerClient() {
  const { showSessionExpired, handleLogout } = useSession();

  // State
  const [isNotAssigned, setIsNotAssigned] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
  const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
  const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
  const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);

  const [loading, setLoading] = useState(true);
  const [kelasNama, setKelasNama] = useState('');
  const [siswaList, setSiswaList] = useState<SiswaKokurikuler[]>([]);
  const [filteredSiswa, setFilteredSiswa] = useState<SiswaKokurikuler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);

  const [gradeConfig, setGradeConfig] = useState<GradeConfig[]>([]);
  const [judulProyek, setJudulProyek] = useState<JudulProyek>({ id_judul_proyek: null, judul: '', deskripsi: '' });

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const [showDetail, setShowDetail] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaKokurikuler | null>(null);
  const [editingNilai, setEditingNilai] = useState<Record<number, NilaiAspek>>({});

  const [showEdit, setShowEdit] = useState(false);
  const [editClosing, setEditClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showProyekModal, setShowProyekModal] = useState(false);
  const [editingProyek, setEditingProyek] = useState<JudulProyek>({ id_judul_proyek: null, judul: '', deskripsi: '' });
  const [savingProyek, setSavingProyek] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'save-nilai' | 'save-proyek' | null>(null);
  const [confirmSiswaNama, setConfirmSiswaNama] = useState<string>('');

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const canEditAspek = useCallback((aspekId: number): boolean => {
    if (!jenisPenilaianAktif) return false;
    if (jenisPenilaianAktif === 'PTS') return aspekId === ASPEK_ID.mutabaah;
    if (jenisPenilaianAktif === 'PAS') return true;
    return false;
  }, [jenisPenilaianAktif]);

  const canEditJudulProyek = useCallback((): boolean => {
    return jenisPenilaianAktif === 'PAS';
  }, [jenisPenilaianAktif]);

  const getAspekLockReason = useCallback((aspekId: number): string => {
    if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
    if (jenisPenilaianAktif === 'PTS' && aspekId !== ASPEK_ID.mutabaah) return 'Terkunci - PTS';
    return '';
  }, [jenisPenilaianAktif]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH DATA AWAL
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', { headers });

        // ✅ Handle session expired
        if (taRes.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        if (!taRes.ok) {
          const errData = await taRes.json().catch(() => ({ code: 'UNKNOWN' }));
          if (errData.code === 'NOT_ASSIGNED') {
            setIsNotAssigned(true);
            return;
          }
          throw new Error('Gagal memuat tahun ajaran');
        }

        const taData = await taRes.json();
        if (!taData.success) {
          throw new Error(taData.message || 'Gagal memuat tahun ajaran');
        }

        const { status_pts, status_pas, semester: sem } = taData.data;

        setStatusPTS(status_pts || 'nonaktif');
        setStatusPAS(status_pas || 'nonaktif');

        if (status_pts === 'aktif') {
          setJenisPenilaianAktif('PTS');
          setIsReadOnly(false);
          setReadOnlyReason(null);
        } else if (status_pas === 'aktif') {
          setJenisPenilaianAktif('PAS');
          setIsReadOnly(false);
          setReadOnlyReason(null);
        } else if (status_pts === 'selesai' || status_pas === 'selesai') {
          setIsReadOnly(true);
          setReadOnlyReason('locked');
          setJenisPenilaianAktif(status_pts === 'selesai' ? 'PTS' : 'PAS');
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: 'Periode Penilaian Selesai',
              message: 'Periode penilaian telah selesai dan data sudah dikunci.\n\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit.'
            });
          }, 500);
        } else {
          setIsReadOnly(true);
          setReadOnlyReason('not_open');
          setJenisPenilaianAktif(null);
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: '⏳ Periode Penilaian Belum Aktif',
              message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi belum dapat menginput nilai.\n\nSilakan hubungi admin untuk membuka periode penilaian.'
            });
          }, 500);
        }

        const [gradeRes, proyekRes] = await Promise.all([
          fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/kategori-kokurikuler', { headers }),
          fetch('http://localhost:5000/api/guru-kelas/kokurikuler/judul-proyek', { headers }),
        ]);

        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          if (gradeData.success) {
            setGradeConfig(gradeData.data || []);
          }
        }

        if (proyekRes.ok) {
          const proyekData = await proyekRes.json();
          if (proyekData.success && proyekData.data) {
            setJudulProyek(proyekData.data);
          }
        }

      } catch (err: any) {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH NILAI SISWA
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchNilai = async () => {
      setDataLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const res = await fetch(`http://localhost:5000/api/guru-kelas/kokurikuler`, { headers });

        // ✅ Handle session expired
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Gagal memuat' }));
          if (res.status === 403 && err.code === 'NOT_ASSIGNED') {
            setIsNotAssigned(true);
            return;
          }
          throw new Error(err.message || 'Gagal memuat data');
        }

        const data = await res.json();

        if (data.success) {
          if (data.kelas) setKelasNama(data.kelas);

          const mapped: SiswaKokurikuler[] = (data.data || []).map((s: any) => ({
            id: s.id || s.id_siswa,
            nama: s.nama || s.nama_lengkap,
            nis: s.nis || '-',
            nisn: s.nisn || '-',
            nilai: s.nilai || {},
          }));

          setSiswaList(mapped);
          setFilteredSiswa(mapped);
          setCurrentPage(1);
        }
      } catch (err: any) {
        showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data nilai.' });
      } finally {
        setDataLoading(false);
      }
    };

    fetchNilai();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER & PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSiswa(siswaList);
    } else {
      const q = searchQuery.toLowerCase().trim();
      setFilteredSiswa(siswaList.filter(s =>
        s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
      ));
    }
    setCurrentPage(1);
  }, [searchQuery, siswaList]);

  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
    const btnActive = "text-white border-orange-500";
    const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

    pages.push(
      <button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>
    );
    const range: number[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
    else {
      range.push(1);
      if (currentPage > 3) range.push(-1);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
      if (currentPage < totalPages - 2) range.push(-2);
      range.push(totalPages);
    }
    range.forEach((p) => {
      if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
      else {
        pages.push(
          <button key={p} onClick={() => setCurrentPage(p)}
            className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
            style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
          >{p}</button>
        );
      }
    });
    pages.push(
      <button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>
    );
    return pages;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getGradeByNilai = (nilai: number | null, aspekId: number): { grade: string | null; deskripsi: string | null } => {
    if (nilai === null || nilai === undefined) {
      return { grade: null, deskripsi: null };
    }

    const configForAspek = gradeConfig.filter((c) => c.id_aspek_kokurikuler === aspekId);

    for (const c of configForAspek) {
      const min = parseFloat(String(c.rentang_min ?? c.min_nilai));
      const max = parseFloat(String(c.rentang_max ?? c.max_nilai));

      if (!isNaN(min) && !isNaN(max) && nilai >= min && nilai <= max) {
        return { grade: c.grade, deskripsi: c.deskripsi };
      }
    }

    return { grade: null, deskripsi: null };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDetail = (siswa: SiswaKokurikuler) => {
    setSelectedSiswa(siswa);
    setEditingNilai({ ...siswa.nilai });
    setShowDetail(true);
  };

  const closeDetail = () => {
    setDetailClosing(true);
    setTimeout(() => {
      setShowDetail(false);
      setDetailClosing(false);
      setSelectedSiswa(null);
    }, 200);
  };

  const handleEdit = (siswa: SiswaKokurikuler) => {
    if (isReadOnly) {
      if (readOnlyReason === 'locked') {
        showModal({
          type: 'warning',
          title: 'Mode Baca Saja',
          message: 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit nilai siswa.'
        });
      } else {
        showModal({
          type: 'warning',
          title: '⏳ Mode Baca Saja',
          message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit nilai siswa.\n\nSilakan tunggu admin membuka periode penilaian.'
        });
      }
      return;
    }

    if (!jenisPenilaianAktif) {
      showModal({
        type: 'warning',
        title: 'Periode Belum Aktif',
        message: 'Periode penilaian belum aktif.\n\nSilakan tunggu admin membuka periode penilaian.'
      });
      return;
    }

    setSelectedSiswa(siswa);
    setEditingNilai({ ...siswa.nilai });
    setShowEdit(true);
  };

  const closeEdit = () => {
    setEditClosing(true);
    setTimeout(() => {
      setShowEdit(false);
      setEditClosing(false);
      setSelectedSiswa(null);
    }, 200);
  };

  // ✅ PERBAIKAN: Validasi nilai real-time
  const handleNilaiChange = (aspekId: number, nilai: number | null) => {
    // Validasi nilai
    if (nilai !== null) {
      // Validasi range 0-100
      if (nilai < 0 || nilai > 100) {
        showModal({
          type: 'warning',
          title: 'Nilai Tidak Valid',
          message: 'Nilai harus antara 0 dan 100.'
        });
        return;
      }
      
      // Validasi integer
      if (!Number.isInteger(nilai)) {
        showModal({
          type: 'warning',
          title: 'Nilai Tidak Valid',
          message: 'Nilai harus bilangan bulat (integer).'
        });
        return;
      }
    }

    setEditingNilai(prev => {
      const { grade, deskripsi } = getGradeByNilai(nilai, aspekId);
      return {
        ...prev,
        [aspekId]: {
          nilai,
          grade,
          deskripsi
        }
      };
    });
  };

  // ✅ PERBAIKAN: Validasi semua aspek terisi
  const openConfirmSimpan = () => {
    if (!selectedSiswa) return;

    // ✅ Validasi semua aspek yang bisa diedit sudah terisi
    const aspekBelumTerisi = DAFTAR_ASPEK.filter(aspek => {
      if (!canEditAspek(aspek.id)) return false; // Skip yang terkunci
      const nilaiData = editingNilai[aspek.id];
      return !nilaiData || nilaiData.nilai === null || nilaiData.nilai === undefined;
    });

    if (aspekBelumTerisi.length > 0) {
      showModal({
        type: 'warning',
        title: 'Nilai Belum Lengkap',
        message: `Aspek berikut belum diisi:\n${aspekBelumTerisi.map(a => `• ${a.nama}`).join('\n')}`
      });
      return;
    }

    const hasChanges = Object.keys(editingNilai).some(aspekIdStr => {
      const aspekId = Number(aspekIdStr);
      if (!canEditAspek(aspekId)) return false;

      const newNilai = editingNilai[aspekId]?.nilai;
      const oldNilai = selectedSiswa.nilai[aspekId]?.nilai;
      return newNilai !== oldNilai;
    });

    if (!hasChanges) {
      showModal({
        type: 'warning',
        title: 'Tidak Ada Perubahan',
        message: 'Data yang Anda masukkan sama dengan data sebelumnya.'
      });
      return;
    }

    setConfirmSiswaNama(selectedSiswa.nama);
    setConfirmAction('save-nilai');
    setShowConfirmModal(true);
  };

  // ✅ PERBAIKAN: Error handling & timeout
  const executeSimpanNilai = async () => {
    if (!selectedSiswa) return;

    setSaving(true);
    
    // ✅ Buat AbortController untuk timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik

    try {
      const token = localStorage.getItem('token');

      const promises = Object.keys(editingNilai).map(async (aspekIdStr) => {
        const aspekId = Number(aspekIdStr);

        if (!canEditAspek(aspekId)) return;

        const newNilai = editingNilai[aspekId]?.nilai;
        const oldNilai = selectedSiswa.nilai[aspekId]?.nilai;

        if (newNilai !== oldNilai) {
          const { grade, deskripsi } = getGradeByNilai(newNilai, aspekId);

          const res = await fetch(`http://localhost:5000/api/guru-kelas/kokurikuler/${selectedSiswa.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              aspek_id: aspekId,
              nilai: newNilai,
              grade,
              deskripsi,
            }),
            signal: controller.signal, // ✅ Tambah signal
          });

          // ✅ Handle session expired
          if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            throw new Error('Sesi berakhir');
          }

          if (!res.ok) {
            const errData = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
            throw new Error(errData.message || `Gagal menyimpan aspek ${aspekId}`);
          }
        }
      });

      await Promise.all(promises);
      clearTimeout(timeoutId); // ✅ Clear timeout

      const updated: SiswaKokurikuler = {
        ...selectedSiswa,
        nilai: editingNilai,
      };

      setSiswaList(prev => prev.map(s => s.id === selectedSiswa.id ? updated : s));
      setFilteredSiswa(prev => prev.map(s => s.id === selectedSiswa.id ? updated : s));

      setShowConfirmModal(false);
      setShowEdit(false);
      setSelectedSiswa(null);

      showModal({
        type: 'success',
        title: 'Nilai Disimpan!',
        message: `Nilai ${updated.nama} berhasil disimpan.`
      });
    } catch (err: any) {
      clearTimeout(timeoutId); // ✅ Clear timeout
      
      // ✅ Handle timeout
      if (err.name === 'AbortError') {
        showModal({
          type: 'error',
          title: 'Request Timeout',
          message: 'Permintaan Anda terlalu lama. Silakan coba lagi.'
        });
        return;
      }
      
      // ✅ Jangan show error jika session expired
      if (err.message === 'Sesi berakhir') return;
      
      setShowConfirmModal(false);
      showModal({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Gagal menyimpan nilai.'
      });
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JUDUL PROYEK HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const openProyekModal = () => {
    if (!canEditJudulProyek()) {
      showModal({
        type: 'warning',
        title: 'Judul Proyek Terkunci',
        message: 'Judul proyek hanya dapat diatur saat periode PAS aktif.\n\nSilakan tunggu admin mengaktifkan periode PAS.'
      });
      return;
    }

    setEditingProyek({ ...judulProyek });
    setShowProyekModal(true);
  };

  const closeProyekModal = () => {
    setShowProyekModal(false);
    setEditingProyek({ id_judul_proyek: null, judul: '', deskripsi: '' });
  };

  // ✅ PERBAIKAN: Validasi panjang judul
  const openConfirmSaveProyek = () => {
    if (!editingProyek.judul.trim()) {
      showModal({ type: 'warning', title: 'Judul Kosong', message: 'Judul proyek tidak boleh kosong.' });
      return;
    }

    // ✅ Validasi panjang judul
    if (editingProyek.judul.length > 255) {
      showModal({
        type: 'warning',
        title: 'Judul Terlalu Panjang',
        message: 'Judul proyek maksimal 255 karakter.'
      });
      return;
    }

    setConfirmAction('save-proyek');
    setShowConfirmModal(true);
  };

  // ✅ PERBAIKAN: Error handling & timeout
  const executeSaveProyek = async () => {
    setSavingProyek(true);
    
    // ✅ Buat AbortController untuk timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/guru-kelas/kokurikuler/judul-proyek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          judul: editingProyek.judul.trim(),
          deskripsi: editingProyek.deskripsi?.trim() || null,
        }),
        signal: controller.signal, // ✅ Tambah signal
      });

      clearTimeout(timeoutId); // ✅ Clear timeout

      // ✅ Handle session expired
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setJudulProyek({
          id_judul_proyek: data.data?.id || editingProyek.id_judul_proyek,
          judul: editingProyek.judul.trim(),
          deskripsi: editingProyek.deskripsi?.trim() || null
        });

        setShowConfirmModal(false);
        closeProyekModal();
        showModal({ type: 'success', title: 'Berhasil!', message: 'Judul proyek berhasil disimpan.' });
      } else {
        const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
        throw new Error(err.message || 'Gagal menyimpan judul proyek');
      }
    } catch (err: any) {
      clearTimeout(timeoutId); // ✅ Clear timeout
      
      // ✅ Handle timeout
      if (err.name === 'AbortError') {
        showModal({
          type: 'error',
          title: 'Request Timeout',
          message: 'Permintaan Anda terlalu lama. Silakan coba lagi.'
        });
        return;
      }
      
      // ✅ Jangan show error jika session expired
      if (err.message === 'Sesi berakhir') return;
      
      setShowConfirmModal(false);
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan judul proyek.' });
    } finally {
      setSavingProyek(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BADGE NILAI
  // ═══════════════════════════════════════════════════════════════════════════

  const NilaiBadge = ({ nilai }: { nilai: number | null }) => {
    if (nilai === null || nilai === undefined) {
      return <span className="text-gray-400 text-xs">—</span>;
    }

    return (
      <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
        style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
        {nilai}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (isNotAssigned) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Anda belum ditugaskan sebagai guru kelas di semester ini.
                <br />
                Silakan hubungi Administrator untuk penugasan kelas.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
              }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER UTAMA
  // ═══════════════════════════════════════════════════════════════════════════

  const canEditNilai = !isReadOnly && jenisPenilaianAktif !== null;
  const isPasActive = jenisPenilaianAktif === 'PAS';
  const isPtsActive = jenisPenilaianAktif === 'PTS';

  const DAFTAR_ASPEK = [
    { id: ASPEK_ID.mutabaah, nama: "Mutaba'ah Yaumiyah", kode: 'MUTABAAH' },
    { id: ASPEK_ID.bpi, nama: 'Mentoring BPI', kode: 'BPI' },
    { id: ASPEK_ID.literasi, nama: 'Literasi', kode: 'LITERASI' },
    { id: ASPEK_ID.proyek, nama: 'Penilaian Proyek', kode: 'PROYEK' },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ BANNER INFO - LEBIH VISUAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderBannerInfo = () => {
    if (isReadOnly) {
      return (
        <div className="mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}` }}>
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7' }}>
            <Lock className={`w-5 h-5 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
            <p className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
              Mode Baca Saja (Read Only)
            </p>
          </div>
          <div className="px-4 py-3 bg-white">
            <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
              {readOnlyReason === 'locked'
                ? 'Periode penilaian telah selesai. Data sudah dikunci dan tidak dapat diedit.'
                : 'Periode penilaian belum aktif. Silakan hubungi admin untuk membuka periode penilaian.'}
            </p>
          </div>
        </div>
      );
    }

    if (!jenisPenilaianAktif) return null;

    // Daftar aspek yang bisa dan tidak bisa diinput
    const editableAspek = DAFTAR_ASPEK.filter(a => canEditAspek(a.id));
    const lockedAspek = DAFTAR_ASPEK.filter(a => !canEditAspek(a.id));

    return (
      <div className="mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}` }}>
        {/* Header Banner */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: isPtsActive ? '#fff7ed' : '#ecfdf5' }}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPtsActive ? 'bg-orange-100' : 'bg-green-100'}`}>
            <Calendar className={`w-4 h-4 ${isPtsActive ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isPtsActive ? 'text-orange-900' : 'text-green-900'}`}>
              Periode {jenisPenilaianAktif} Sedang Aktif
            </p>
            <p className={`text-xs ${isPtsActive ? 'text-orange-700' : 'text-green-700'}`}>
              {isPtsActive ? 'Penilaian Tengah Semester' : 'Penilaian Akhir Semester'}
            </p>
          </div>
        </div>

        {/* Content - 2 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-white">
          {/* Kolom Kiri: Yang Bisa Diinput */}
          <div className="p-4 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Unlock size={12} className="text-green-600" />
              </div>
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Dapat Diinput</p>
            </div>
            <div className="space-y-2">
              {editableAspek.map(aspek => (
                <div key={aspek.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-900">{aspek.nama}</span>
                </div>
              ))}
              {isPasActive && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-900">Judul Proyek</span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Yang Terkunci */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={12} className="text-gray-600" />
              </div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Terkunci</p>
            </div>
            {lockedAspek.length > 0 ? (
              <div className="space-y-2">
                {lockedAspek.map(aspek => (
                  <div key={aspek.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <Lock size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{aspek.nama}</span>
                  </div>
                ))}
                {!isPasActive && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <Lock size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Judul Proyek</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 font-medium">✨ Semua aspek terbuka</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      {/* ✅ BANNER INFO - Komponen Baru */}
      {renderBannerInfo()}

      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Nilai Kokurikuler
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
              Kelas <strong>{kelasNama}</strong> • Kelola nilai kokurikuler siswa
            </p>
          </div>

          <button
            onClick={openProyekModal}
            disabled={!canEditJudulProyek()}
            className={`${btnPrimary.base} disabled:opacity-50 disabled:cursor-not-allowed`}
            style={!canEditJudulProyek()
              ? { background: '#d1d5db', boxShadow: 'none' }
              : btnPrimary.style}
            onMouseEnter={e => { if (canEditJudulProyek()) btnPrimary.hover(e); }}
            onMouseLeave={e => { if (canEditJudulProyek()) btnPrimary.leave(e); }}
            title={!canEditJudulProyek() ? 'Judul proyek hanya bisa diatur saat PAS aktif' : ''}
          >
            <BookOpen size={16} />
            {judulProyek.judul ? 'Edit Judul Proyek' : 'Atur Judul Proyek'}
            {!canEditJudulProyek() && <Lock size={14} />}
          </button>
        </div>

        {judulProyek.judul && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                <BookOpen size={20} style={{ color: '#c2410c' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#c2410c' }}>Judul Proyek Kelas Ini</p>
                <p className="text-lg font-bold break-words" style={{ color: '#7a3a0a' }}>{judulProyek.judul}</p>
                {judulProyek.deskripsi && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{judulProyek.deskripsi}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="relative min-w-[220px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
              </div>
              <input type="text" placeholder="Cari siswa..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
              <select value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
            Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} siswa
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={TH_GRAD}>
                {['No.', 'Nama Siswa', 'NIS', 'NISN', "Mutaba'ah", 'BPI', 'Literasi', 'Proyek', 'Aksi'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                      Memuat data nilai...
                    </div>
                  </td>
                </tr>
              ) : currentSiswa.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                  </td>
                </tr>
              ) : (
                currentSiswa.map((siswa, idx) => (
                  <tr key={siswa.id} className="transition-colors"
                    style={{ borderBottom: '1px solid #fde0c8', background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}>
                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai[ASPEK_ID.mutabaah]?.nilai ?? null} /></td>
                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai[ASPEK_ID.bpi]?.nilai ?? null} /></td>
                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai[ASPEK_ID.literasi]?.nilai ?? null} /></td>
                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai[ASPEK_ID.proyek]?.nilai ?? null} /></td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleDetail(siswa)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                          <Eye size={13} /> Detail
                        </button>
                        <button
                          onClick={() => handleEdit(siswa)}
                          disabled={!canEditNilai}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: canEditNilai ? '#fff0e5' : '#e5e7eb',
                            border: canEditNilai ? '1px solid #f5a623' : '1px solid #d1d5db',
                            color: canEditNilai ? '#b35a08' : '#6b7280'
                          }}
                          onMouseEnter={e => {
                            if (canEditNilai) {
                              e.currentTarget.style.background = '#ffe4c8';
                            }
                          }}
                          onMouseLeave={e => {
                            if (canEditNilai) {
                              e.currentTarget.style.background = '#fff0e5';
                            }
                          }}
                        >
                          {canEditNilai ? (
                            <>
                              <Pencil size={13} /> Edit
                            </>
                          ) : (
                            <>
                              <Lock size={13} /> Terkunci
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredSiswa.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
            <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex items-center gap-1">{renderPagination()}</div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ✅ MODAL DETAIL - LEBIH BAGUS, DESKRIPSI AREA LEBIH LUAS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showDetail && selectedSiswa && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <div>
                <h2 className="text-lg font-bold text-white">Detail Nilai Kokurikuler</h2>
                <p className="text-xs text-orange-100 mt-0.5">{selectedSiswa.nama} - {kelasNama}</p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Siswa */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                  <p className="text-xs text-gray-500 mb-0.5">NIS</p>
                  <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nis}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                  <p className="text-xs text-gray-500 mb-0.5">NISN</p>
                  <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nisn}</p>
                </div>
              </div>

              {/* Judul Proyek (jika ada) */}
              {judulProyek.judul && (
                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                      <BookOpen size={18} style={{ color: '#c2410c' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c2410c' }}>Judul Proyek</p>
                      <p className="text-sm font-bold break-words" style={{ color: '#7a3a0a' }}>{judulProyek.judul}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ DAFTAR ASPEK - Layout Baru: Nilai+Grade di kiri, Deskripsi full di kanan */}
              <div className="space-y-4">
                {DAFTAR_ASPEK.map(aspek => {
                  const nilaiData = selectedSiswa.nilai[aspek.id];
                  const nilai = nilaiData?.nilai;
                  const grade = nilaiData?.grade;
                  const deskripsi = nilaiData?.deskripsi;
                  const hasValue = nilai !== null && nilai !== undefined;

                  return (
                    <div key={aspek.id} className="rounded-xl overflow-hidden border-2" style={{ borderColor: '#fdba74' }}>
                      {/* Header Aspek */}
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#fff7ed' }}>
                        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                          <div className="w-1.5 h-5 rounded-full" style={{ background: '#e8690a' }}></div>
                          {aspek.nama}
                        </h3>
                        {hasValue && grade && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#e8690a' }}>
                            <Award size={12} />
                            Grade {grade}
                          </span>
                        )}
                      </div>

                      {/* Content - Layout 2 kolom */}
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Kolom 1: Nilai */}
                          <div className="text-center p-3 rounded-lg" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                            <p className="text-xs text-gray-500 mb-1">Nilai</p>
                            <div className="text-3xl font-bold" style={{ color: hasValue ? '#c2410c' : '#d1d5db' }}>
                              {hasValue ? nilai : '—'}
                            </div>
                          </div>

                          {/* Kolom 2: Grade */}
                          <div className="text-center p-3 rounded-lg" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                            <p className="text-xs text-gray-500 mb-1">Grade</p>
                            <div className="text-3xl font-bold" style={{ color: grade ? '#c2410c' : '#d1d5db' }}>
                              {grade || '—'}
                            </div>
                          </div>

                          {/* Kolom 3: Deskripsi - LEBIH LUAS */}
                          <div className="md:col-span-1 p-3 rounded-lg" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                            <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap min-h-[48px]" style={{ color: deskripsi ? '#374151' : '#9ca3af' }}>
                              {deskripsi || <span className="italic">Belum ada deskripsi</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
              {canEditNilai && (
                <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                  className={btnPrimary.base} style={btnPrimary.style}
                  onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                  <Pencil size={14} /> Edit Nilai
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ✅ MODAL EDIT - LEBIH BAGUS, DESKRIPSI AREA LEBIH LUAS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showEdit && selectedSiswa && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Nilai Kokurikuler</h2>
                <p className="text-xs text-orange-100 mt-0.5">{selectedSiswa.nama} - {kelasNama}</p>
              </div>
              <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Periode Aktif */}
              {jenisPenilaianAktif && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: isPtsActive ? '#fff7ed' : '#ecfdf5', border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}` }}>
                  <Calendar size={18} style={{ color: isPtsActive ? '#c2410c' : '#166534', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: isPtsActive ? '#7a3a0a' : '#14532d' }}>
                    <strong>Periode {jenisPenilaianAktif} Aktif</strong>
                    {isPtsActive && ' — Hanya Mutaba\'ah yang dapat diinput'}
                    {isPasActive && ' — Semua aspek dapat diinput'}
                  </p>
                </div>
              )}

              {/* ✅ Render aspek dengan layout baru */}
              {DAFTAR_ASPEK.map(aspek => {
                const nilaiData = editingNilai[aspek.id];
                const nilai = nilaiData?.nilai;
                const { grade, deskripsi } = getGradeByNilai(nilai ?? null, aspek.id);

                const isAspekEditable = canEditAspek(aspek.id);
                const lockReason = getAspekLockReason(aspek.id);

                return (
                  <div key={aspek.id} className="rounded-xl overflow-hidden border-2"
                    style={{
                      borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                      opacity: isAspekEditable ? 1 : 0.75
                    }}>
                    
                    {/* Header Aspek */}
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: isAspekEditable ? '#fff7ed' : '#f3f4f6' }}>
                      <h3 className="text-sm font-bold flex items-center gap-2"
                        style={{ color: isAspekEditable ? '#7a3a0a' : '#6b7280' }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: isAspekEditable ? '#e8690a' : '#9ca3af' }}></div>
                        {aspek.nama}
                      </h3>
                      {!isAspekEditable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                          <Lock size={11} />
                          {lockReason}
                        </span>
                      ) : grade ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#e8690a' }}>
                          <Award size={11} />
                          Grade {grade}
                        </span>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="p-4" style={{ background: isAspekEditable ? '#fffaf6' : '#f9fafb' }}>
                      {/* Input Nilai & Grade Preview - 1 baris */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>
                            Nilai (0-100)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={nilai ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = val === '' ? null : parseFloat(val);
                              handleNilaiChange(aspek.id, num === null || isNaN(num) ? null : Math.floor(num));
                            }}
                            disabled={!isAspekEditable}
                            className={isAspekEditable ? inputCls : inputDisabledCls}
                            placeholder={isAspekEditable ? "Masukkan nilai 0-100" : "Terkunci"}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>
                            Grade Otomatis
                          </label>
                          <div className="w-full border rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
                            style={{
                              background: isAspekEditable ? 'rgba(255, 247, 237, 0.4)' : '#f3f4f6',
                              borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                              color: isAspekEditable ? '#7a3a0a' : '#9ca3af',
                              minHeight: '42px'
                            }}>
                            {grade ? (
                              <>
                                <Award size={16} className="text-orange-500 flex-shrink-0" />
                                <span className="font-bold">{grade}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ✅ DESKRIPSI - AREA LEBIH LUAS, FULL WIDTH */}
                      {deskripsi && (
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>
                            Deskripsi Penilaian
                          </label>
                          <div className="w-full border rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[60px]"
                            style={{
                              background: isAspekEditable ? 'rgba(255, 247, 237, 0.4)' : '#f3f4f6',
                              borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                              color: isAspekEditable ? '#374151' : '#9ca3af'
                            }}>
                            {deskripsi}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeEdit} disabled={saving}>Batal</BtnSecondary>
              <button onClick={openConfirmSimpan} disabled={saving}
                className={`px-6 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={btnPrimary.style}
                onMouseEnter={e => { if (!saving) btnPrimary.hover(e); }}
                onMouseLeave={e => { if (!saving) btnPrimary.leave(e); }}>
                {saving ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Nilai
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL JUDUL PROYEK */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showProyekModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 dg-fadeIn"
          onClick={e => { if (e.target === e.currentTarget) closeProyekModal(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md dg-scaleIn" style={CARD_STYLE}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={18} />
                {editingProyek.id_judul_proyek ? 'Edit Judul Proyek' : 'Atur Judul Proyek'}
              </h2>
              <button onClick={closeProyekModal} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 rounded-lg border space-y-2" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#c2410c' }}>Informasi</p>
                <p className="text-sm text-gray-700">
                  Judul proyek ini akan digunakan untuk semua siswa di kelas {kelasNama}.
                  Nilai proyek akan diberikan kepada setiap siswa secara individual.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900">
                  Judul Proyek <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProyek.judul}
                  onChange={(e) => setEditingProyek({ ...editingProyek, judul: e.target.value })}
                  placeholder="Contoh: Proyek Kebersihan Lingkungan"
                  className={inputCls}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900">
                  Deskripsi <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={editingProyek.deskripsi || ''}
                  onChange={(e) => setEditingProyek({ ...editingProyek, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat tentang proyek ini..."
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeProyekModal} disabled={savingProyek}>Batal</BtnSecondary>
              <button
                onClick={openConfirmSaveProyek}
                disabled={savingProyek || !editingProyek.judul.trim()}
                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                {savingProyek ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL KONFIRMASI */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 dg-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget && !saving && !savingProyek) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} className="text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                Konfirmasi Penyimpanan
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
              {confirmAction === 'save-nilai' && `Apakah Anda yakin ingin menyimpan nilai ${confirmSiswaNama}?`}
              {confirmAction === 'save-proyek' && 'Apakah Anda yakin ingin menyimpan judul proyek ini?'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={saving || savingProyek}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'save-nilai') {
                    executeSimpanNilai();
                  } else if (confirmAction === 'save-proyek') {
                    executeSaveProyek();
                  }
                }}
                disabled={saving || savingProyek}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
              >
                {(saving || savingProyek) ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>Simpan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}