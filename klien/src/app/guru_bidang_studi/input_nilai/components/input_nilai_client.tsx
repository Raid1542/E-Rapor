/**
 * Nama File: input_nilai_client.tsx
 * Fungsi: Komponen klien untuk mengelola input nilai siswa oleh guru bidang studi
 * UI Redesign: Tema oranye elegan, konsisten dengan DataMataPelajaranPage
 */
'use client';
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Pencil, Eye, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Lock, BookOpen } from 'lucide-react';

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface Mapel {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
}

interface NilaiSiswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    nilai_rapor_pts: number | null;
    deskripsi_pts: string | null;
    is_locked_pts: boolean;
    nilai_rapor_pas: number | null;
    deskripsi_pas: string | null;
    is_locked_pas: boolean;
    nilai: Record<number, number | null>;
}

interface Komponen {
    id: number;
    nama: string;
    bobot: number;
}

interface KelasItem {
    kelas_id: number;
    nama_kelas: string;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes in-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes in-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes in-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .in-fadeIn  { animation: in-fadeIn  0.2s ease; }
        .in-scaleIn { animation: in-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .in-pulse   { animation: in-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ====== NOTIF MODAL (Z-INDEX 90 - PALING TINGGI) ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} in-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                        >Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >Ya, Lanjutkan</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
                )}
            </div>
        </div>
    );
};

// ====== SHARED STYLE CONSTANTS ======
const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputDisabledCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-500 outline-none bg-gray-100 border-gray-200 cursor-not-allowed";

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

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => { if (!disabled) (e.currentTarget.style.background = '#fff0e5'); }}
        onMouseLeave={e => { if (!disabled) (e.currentTarget.style.background = '#fff'); }}
    >{children}</button>
);

// ====== MAIN COMPONENT ======
export default function InputNilaiClient() {
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [mapelList, setMapelList] = useState<Mapel[]>([]);
    const [kelasList, setKelasList] = useState<KelasItem[]>([]);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
    const [siswaList, setSiswaList] = useState<NilaiSiswa[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<NilaiSiswa[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMapel, setLoadingMapel] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('');
    const [currentMapel, setCurrentMapel] = useState<Mapel | null>(null);
    const [komponenList, setKomponenList] = useState<Komponen[]>([]);

    // Modal Detail (z-index 60)
    const [showDetail, setShowDetail] = useState(false);
    const [detailSiswa, setDetailSiswa] = useState<NilaiSiswa | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);

    // Modal Edit Komponen (z-index 60)
    const [editingSiswa, setEditingSiswa] = useState<NilaiSiswa | null>(null);
    const [editingKomponenNilai, setEditingKomponenNilai] = useState<Record<number, number | null>>({});
    const initialEditingKomponenNilaiRef = useRef<Record<number, number | null>>({});
    const [editKomponenClosing, setEditKomponenClosing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Notif Modal (z-index 90 - PALING TINGGI)
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ====== FETCH MAPEL ======
    useEffect(() => {
        const fetchMapel = async () => {
            setLoadingMapel(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    return;
                }
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/mapel', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(`HTTP ${res.status}: ${errorData.message || 'Gagal memuat mata pelajaran'}`);
                }
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.message || 'Respons backend tidak sukses');
                }
                setMapelList(data.data || []);
            } catch (err) {
                console.error('Error fetch mapel:', err);
                showModal({
                    type: 'network',
                    title: 'Gagal Memuat Mapel',
                    message: err instanceof Error ? err.message : 'Tidak dapat terhubung ke server.'
                });
            } finally {
                setLoadingMapel(false);
            }
        };
        fetchMapel();
    }, [showModal]);

    // ====== FETCH KELAS ======
    useEffect(() => {
        if (selectedMapelId === null) {
            setKelasList([]);
            setSelectedKelasId(null);
            return;
        }
        const fetchKelas = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kelas', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat daftar kelas');
                const data = await res.json();
                if (data.success) {
                    setKelasList(data.data || []);
                    if (data.data && data.data.length === 1) {
                        setSelectedKelasId(data.data[0].kelas_id);
                    }
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
                setKelasList([]);
            }
        };
        fetchKelas();
    }, [selectedMapelId]);

    // ====== FETCH KOMPONEN ======
    useEffect(() => {
        const fetchKomponen = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/komponen', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat komponen penilaian');
                const data = await res.json();
                if (data.success) {
                    const komponen: Komponen[] = data.data.map((k: any) => ({
                        id: k.id_komponen,
                        nama: k.nama_komponen,
                        bobot: k.persentase || 0,
                    }));
                    setKomponenList(komponen);
                }
            } catch (err) {
                console.error('Error fetch komponen:', err);
            }
        };
        fetchKomponen();
    }, []);

    // ====== FETCH NILAI ======
    useEffect(() => {
        if (selectedMapelId === null || selectedKelasId === null) {
            setSiswaList([]);
            setFilteredSiswa([]);
            setCurrentMapel(null);
            return;
        }
        const fetchNilai = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');
                const res = await fetch(
                    `http://localhost:5000/api/guru-bidang-studi/nilai/${selectedMapelId}/${selectedKelasId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Gagal mengambil data nilai');
                }
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.message || 'Operasi gagal');
                }
                const jenisAktif = data.jenis_penilaian_aktif || null;
                setJenisPenilaianAktif(jenisAktif);
                if (!Array.isArray(data.siswaList)) {
                    throw new Error('Data siswa tidak valid');
                }
                const komponenUntukRender = komponenList.length > 0
                    ? komponenList
                    : [
                        { id: 1, nama: 'UH 1', bobot: 0 },
                        { id: 2, nama: 'UH 2', bobot: 0 },
                        { id: 3, nama: 'UH 3', bobot: 0 },
                        { id: 4, nama: 'UH 4', bobot: 0 },
                        { id: 5, nama: 'UH 5', bobot: 0 },
                        { id: 6, nama: 'PTS', bobot: 0 },
                        { id: 7, nama: 'PAS', bobot: 0 },
                    ];
                const siswaWithNilai: NilaiSiswa[] = data.siswaList.map((s: any) => {
                    const nilaiRecord: Record<number, number | null> = {};
                    komponenUntukRender.forEach(k => {
                        nilaiRecord[k.id] = s.nilai?.[k.id] ?? null;
                    });
                    return {
                        id: s.id,
                        nama: s.nama,
                        nis: s.nis,
                        nisn: s.nisn,
                        nilai_rapor_pts: typeof s.nilai_rapor_pts === 'number' ? s.nilai_rapor_pts : null,
                        deskripsi_pts: s.deskripsi_pts || null,
                        is_locked_pts: s.is_locked_pts || false,
                        nilai_rapor_pas: typeof s.nilai_rapor_pas === 'number' ? s.nilai_rapor_pas : null,
                        deskripsi_pas: s.deskripsi_pas || null,
                        is_locked_pas: s.is_locked_pas || false,
                        nilai: nilaiRecord,
                    };
                });
                setSiswaList(siswaWithNilai);
                setFilteredSiswa(siswaWithNilai);
                setKelasNama(data.kelas || '');
                const mapel = mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null;
                setCurrentMapel(mapel);
            } catch (err) {
                console.error('Error fetch nilai:', err);
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data Nilai',
                    message: err instanceof Error ? err.message : 'Coba lagi.'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, selectedKelasId, komponenList, mapelList, showModal]);

    // ====== FILTER SISWA ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            const filtered = siswaList.filter(
                s => s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
            );
            setFilteredSiswa(filtered);
        }
    }, [searchQuery, siswaList]);

    // ====== SIMPAN NILAI KOMPONEN ======
    const simpanNilaiKomponen = async () => {
        if (!editingSiswa || !selectedMapelId || !selectedKelasId) return;

        // Cek validasi nilai
        for (const [idStr, nilai] of Object.entries(editingKomponenNilai)) {
            if (nilai !== null) {
                if (typeof nilai !== 'number' || isNaN(nilai) || nilai < 0 || nilai > 100) {
                    const komponenNama = komponenList.find(k => k.id == Number(idStr))?.nama || idStr;
                    showModal({
                        type: 'warning',
                        title: 'Nilai Tidak Valid',
                        message: `Nilai untuk komponen "${komponenNama}" harus berupa angka bulat antara 0 dan 100.`
                    });
                    return;
                }
                if (!Number.isInteger(nilai)) {
                    const komponenNama = komponenList.find(k => k.id == Number(idStr))?.nama || idStr;
                    showModal({
                        type: 'warning',
                        title: 'Nilai Harus Bulat',
                        message: `Nilai untuk komponen "${komponenNama}" harus bilangan bulat.`
                    });
                    return;
                }
            }
        }

        // === Cek apakah ada perubahan ===
        const hasChanges = Object.keys(editingKomponenNilai).some(key => {
            const kId = Number(key);
            const current = editingKomponenNilai[kId];
            const initial = initialEditingKomponenNilaiRef.current[kId];
            return current !== initial;
        });

        if (!hasChanges) {
            setEditKomponenClosing(true);
            setTimeout(() => {
                setEditingSiswa(null);
                setEditKomponenClosing(false);
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            }, 200);
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token tidak ditemukan');
            const payload = { nilai: editingKomponenNilai };
            const res = await fetch(
                `http://localhost:5000/api/guru-bidang-studi/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menyimpan nilai komponen');
            }
            const data = await res.json();

            const updatedSiswa: NilaiSiswa = {
                ...editingSiswa,
                nilai: editingKomponenNilai,
                nilai_rapor_pts: data.nilai_rapor_pts ?? editingSiswa.nilai_rapor_pts,
                deskripsi_pts: data.deskripsi_pts ?? editingSiswa.deskripsi_pts,
                nilai_rapor_pas: data.nilai_rapor_pas ?? editingSiswa.nilai_rapor_pas,
                deskripsi_pas: data.deskripsi_pas ?? editingSiswa.deskripsi_pas,
            };
            setSiswaList(prev => prev.map(s => (s.id === editingSiswa.id ? updatedSiswa : s)));
            setFilteredSiswa(prev => prev.map(s => (s.id === editingSiswa.id ? updatedSiswa : s)));

            setEditKomponenClosing(true);
            const perubahanMsg = data.perubahan && data.perubahan.length > 0
                ? '\n\nPerubahan:\n' + data.perubahan.map((p: any) => `• ${p.komponen}: ${p.lama ?? '-'} → ${p.baru ?? '-'}`).join('\n')
                : '';

            setEditingSiswa(null);
            setEditKomponenClosing(false);

            showModal({
                type: 'success',
                title: 'Nilai Berhasil Disimpan!',
                message: `Nilai ${data.message || 'berhasil diperbarui'} untuk ${editingSiswa.nama}.${perubahanMsg}`
            });
        } catch (err) {
            console.error('Error simpan nilai komponen:', err);
            showModal({
                type: 'error',
                title: 'Gagal Menyimpan',
                message: err instanceof Error ? err.message : 'Coba lagi.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDetail = (siswa: NilaiSiswa) => {
        setDetailSiswa(siswa);
        setShowDetail(true);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => {
            setShowDetail(false);
            setDetailClosing(false);
            setDetailSiswa(null);
        }, 200);
    };

    const openEditKomponen = (siswa: NilaiSiswa) => {
        if (jenisPenilaianAktif === 'PTS' && siswa.is_locked_pts) {
            showModal({
                type: 'warning',
                title: 'Nilai Terkunci',
                message: `Nilai PTS untuk ${siswa.nama} sudah dikunci dan tidak dapat diubah.\n\nHubungi admin jika perlu perubahan.`
            });
            return;
        }
        if (jenisPenilaianAktif === 'PAS' && siswa.is_locked_pas) {
            showModal({
                type: 'warning',
                title: 'Nilai Terkunci',
                message: `Nilai PAS untuk ${siswa.nama} sudah dikunci dan tidak dapat diubah.\n\nHubungi admin jika perlu perubahan.`
            });
            return;
        }

        const nilaiAwal = { ...siswa.nilai };
        setEditingSiswa(siswa);
        setEditingKomponenNilai(nilaiAwal);
        initialEditingKomponenNilaiRef.current = { ...nilaiAwal };
    };

    const closeEditKomponen = () => {
        setEditKomponenClosing(true);
        setTimeout(() => {
            setEditingSiswa(null);
            setEditKomponenClosing(false);
        }, 200);
    };

    // ====== PAGINATION ======
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage,] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, startIndex + itemsPerPage);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive = "text-white border-orange-500";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

        pages.push(
            <button key="prev" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
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
            <button key="next" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>
        );
        return pages;
    };

    // ====== RENDER ======
    return (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            <div className="max-w-7xl mx-auto">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola input nilai komponen per mata pelajaran dan kelas</p>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                        <div>
                            <h2 className="text-base font-bold text-white">Input Nilai Komponen</h2>
                        </div>
                        {jenisPenilaianAktif && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                                Periode {jenisPenilaianAktif} Aktif
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Info Periode */}
                        {jenisPenilaianAktif && (
                            <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <ShieldAlert size={20} className="mt-0.5 flex-shrink-0" style={{ color: '#c95b08' }} />
                                <div className="text-sm" style={{ color: '#7a3a0a' }}>
                                    <span className="font-bold">Periode {jenisPenilaianAktif} Aktif: </span>
                                    {jenisPenilaianAktif === 'PTS'
                                        ? 'Hanya komponen PTS yang dapat diinput. Komponen lain dikunci otomatis.'
                                        : 'Semua komponen (UH, PTS, PAS) dapat diinput. Pastikan total bobot = 100%.'}
                                </div>
                            </div>
                        )}

                        {/* Dropdown Mapel & Kelas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>
                                    Mata Pelajaran <span className="text-red-500">*</span>
                                </label>
                                {loadingMapel ? (
                                    <div className="text-sm text-gray-400 py-2.5">Memuat...</div>
                                ) : (
                                    <select
                                        value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSelectedMapelId(val ? Number(val) : null);
                                            setSelectedKelasId(null);
                                            setCurrentPage(1);
                                        }}
                                        className={inputCls}
                                    >
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {mapelList
                                            .filter(mapel => mapel.mata_pelajaran_id != null && mapel.jenis === 'pilihan')
                                            .map(mapel => (
                                                <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                                                    {mapel.nama_mapel} ({mapel.jenis})
                                                </option>
                                            ))}
                                    </select>
                                )}
                            </div>

                            {selectedMapelId && (
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls} style={labelColor}>
                                        Kelas <span className="text-red-500">*</span>
                                    </label>
                                    {kelasList.length === 0 ? (
                                        <div className="text-sm text-gray-400 py-2.5">Tidak ada kelas</div>
                                    ) : (
                                        <select
                                            value={selectedKelasId || ''}
                                            onChange={e => {
                                                setSelectedKelasId(e.target.value ? Number(e.target.value) : null);
                                                setCurrentPage(1);
                                            }}
                                            className={inputCls}
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {kelasList.map(kelas => (
                                                <option key={kelas.kelas_id} value={kelas.kelas_id}>
                                                    {kelas.nama_kelas}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedMapelId && selectedKelasId ? (
                            <>
                                {/* Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                                    <p className="text-xs" style={{ color: '#c95b08' }}>
                                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                                    </p>
                                    <div className="relative min-w-[200px] sm:min-w-[260px]">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari nama, NIS, atau NISN..."
                                            value={searchQuery}
                                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                            className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                                className="absolute inset-y-0 right-2 flex items-center"
                                                style={{ color: '#c95b08' }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Tabel */}
                                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #fde0c8' }}>
                                    <table className="w-full min-w-[800px] text-sm border-collapse">
                                        <thead>
                                            <tr style={TH_GRAD}>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">No.</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[160px]">Nama</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[90px]">NIS</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[110px]">NISN</th>
                                                {komponenList.map(k => (
                                                    <th key={k.id} className="px-3 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[60px]">
                                                        {k.nama}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[100px]">Rapor PTS</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[100px]">Rapor PAS</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap min-w-[110px]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                            Memuat data...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : currentSiswa.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                        Tidak ada data siswa
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentSiswa.map((siswa, idx) => {
                                                    const isLocked = jenisPenilaianAktif === 'PTS' ? siswa.is_locked_pts : siswa.is_locked_pas;
                                                    return (
                                                        <tr
                                                            key={siswa.id}
                                                            className="transition-colors"
                                                            style={{ borderBottom: '1px solid #fde0c8', background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}
                                                        >
                                                            <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                                            <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                                            <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                                            <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                                            {komponenList.map(k => {
                                                                const nilai = siswa.nilai[k.id];
                                                                const isNonPTS = jenisPenilaianAktif === 'PTS' && !/PTS/i.test(k.nama);
                                                                return (
                                                                    <td key={`${siswa.id}-${k.id}`} className="px-3 py-3 text-center">
                                                                        {nilai !== null ? (
                                                                            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-lg text-xs font-bold"
                                                                                style={{
                                                                                    background: isNonPTS ? '#f3f4f6' : '#fff0e5',
                                                                                    color: isNonPTS ? '#9ca3af' : '#c95b08',
                                                                                    border: `1px solid ${isNonPTS ? '#e5e7eb' : '#fde0c8'}`
                                                                                }}>
                                                                                {nilai}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-700">—</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-4 py-3 text-center">
                                                                {siswa.nilai_rapor_pts !== null ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold"
                                                                            style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                                            {siswa.nilai_rapor_pts}
                                                                        </span>
                                                                        {siswa.is_locked_pts && (
                                                                            <Lock size={10} className="mt-1 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-700">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {siswa.nilai_rapor_pas !== null ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold"
                                                                            style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                                            {siswa.nilai_rapor_pas}
                                                                        </span>
                                                                        {siswa.is_locked_pas && (
                                                                            <Lock size={10} className="mt-1 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-700">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                <div className="flex justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleDetail(siswa)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                        style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                                        onMouseEnter={e => (e.currentTarget.style.background = '#d4f0dd')}
                                                                        onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                                                    >
                                                                        <Eye size={12} /> Lihat
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openEditKomponen(siswa)}
                                                                        disabled={isLocked}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                                        onMouseEnter={e => { if (!isLocked) e.currentTarget.style.background = '#ffe4c8'; }}
                                                                        onMouseLeave={e => { if (!isLocked) e.currentTarget.style.background = '#fff0e5'; }}
                                                                    >
                                                                        {isLocked ? <Lock size={12} /> : <Pencil size={12} />}
                                                                        {isLocked ? 'Terkunci' : 'Edit'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {filteredSiswa.length > 0 && (
                                    <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                                            Halaman {currentPage} dari {totalPages}
                                        </span>
                                        <div className="flex items-center gap-1">{renderPagination()}</div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-12 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                <p className="text-base font-bold" style={{ color: '#c95b08' }}>
                                    {selectedMapelId && !selectedKelasId
                                        ? 'Pilih Kelas Terlebih Dahulu'
                                        : 'Pilih Mata Pelajaran Terlebih Dahulu'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ====== MODAL DETAIL (Z-INDEX 60) ====== */}
            {showDetail && detailSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-[60] p-4 in-fadeIn transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Nilai Siswa</h2>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Info Siswa */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <div>
                                    <span className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>Nama Siswa</span>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{detailSiswa.nama}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>NIS / NISN</span>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{detailSiswa.nis} / {detailSiswa.nisn}</p>
                                </div>
                            </div>

                            {/* Rapor PTS & PAS - Layout Terpisah */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                {/* Rapor PTS */}
                                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen size={18} style={{ color: '#c95b08' }} />
                                        <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor PTS</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-gray-500">Nilai</span>
                                            <p className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                                                {detailSiswa.nilai_rapor_pts !== null ? detailSiswa.nilai_rapor_pts : '—'}
                                            </p>
                                        </div>
                                        {detailSiswa.deskripsi_pts && (
                                            <div>
                                                <span className="text-xs text-gray-500">Deskripsi</span>
                                                <p className="text-sm mt-1 p-2 rounded-lg bg-white/60" style={{ color: '#7a3a0a' }}>
                                                    {detailSiswa.deskripsi_pts}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rapor PAS */}
                                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen size={18} style={{ color: '#c95b08' }} />
                                        <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor PAS</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-gray-500">Nilai</span>
                                            <p className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                                                {detailSiswa.nilai_rapor_pas !== null ? detailSiswa.nilai_rapor_pas : '—'}
                                            </p>
                                        </div>
                                        {detailSiswa.deskripsi_pas && (
                                            <div>
                                                <span className="text-xs text-gray-500">Deskripsi</span>
                                                <p className="text-sm mt-1 p-2 rounded-lg bg-white/60" style={{ color: '#7a3a0a' }}>
                                                    {detailSiswa.deskripsi_pas}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Nilai Komponen - UH, PTS, PAS Terpisah */}
                            <h3 className="text-sm font-bold mb-3" style={{ color: '#7a3a0a' }}>Nilai per Komponen</h3>

                            {/* UH Components */}
                            <div className="mb-4">
                                <h4 className="text-xs font-semibold mb-2 px-2" style={{ color: '#c95b08' }}>Ulangan Harian</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama)).map(k => {
                                        const nilai = detailSiswa.nilai[k.id];
                                        return (
                                            <div key={k.id} className="p-3 rounded-xl text-center"
                                                style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                                <div className="text-xs font-semibold mb-1" style={{ color: '#c95b08' }}>{k.nama}</div>
                                                <div className="text-2xl font-bold" style={{ color: '#7a3a0a' }}>
                                                    {nilai !== null ? nilai : '—'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PTS & PAS Components - Sejajar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* PTS Component */}
                                {komponenList.filter(k => /^PTS$/i.test(k.nama)).map(k => {
                                    const nilai = detailSiswa.nilai[k.id];
                                    return (
                                        <div key={k.id} className="p-4 rounded-xl text-center"
                                            style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                            <div className="text-xs font-semibold mb-2" style={{ color: '#c95b08' }}>{k.nama}</div>
                                            <div className="text-3xl font-bold" style={{ color: '#7a3a0a' }}>
                                                {nilai !== null ? nilai : '—'}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* PAS Component */}
                                {komponenList.filter(k => /^PAS$/i.test(k.nama)).map(k => {
                                    const nilai = detailSiswa.nilai[k.id];
                                    return (
                                        <div key={k.id} className="p-4 rounded-xl text-center"
                                            style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                            <div className="text-xs font-semibold mb-2" style={{ color: '#c95b08' }}>{k.nama}</div>
                                            <div className="text-3xl font-bold" style={{ color: '#7a3a0a' }}>
                                                {nilai !== null ? nilai : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                            <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                            <button
                                onClick={() => {
                                    openEditKomponen(detailSiswa);
                                    closeDetail();
                                }}
                                className={btnPrimary.base}
                                style={btnPrimary.style}
                                onMouseEnter={btnPrimary.hover}
                                onMouseLeave={btnPrimary.leave}
                            >
                                <Pencil size={14} /> Edit Nilai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL EDIT KOMPONEN (Z-INDEX 60) ====== */}
            {editingSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-[60] p-4 in-fadeIn transition-opacity duration-200 ${editKomponenClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEditKomponen(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col transform transition-all duration-200 ${editKomponenClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Edit Nilai Komponen</h2>
                            <button onClick={closeEditKomponen}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-5 p-3 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <span className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>Siswa</span>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{editingSiswa.nama}</p>
                                {jenisPenilaianAktif && (
                                    <p className="text-xs mt-1" style={{ color: '#c95b08' }}>
                                        Periode aktif: <strong>{jenisPenilaianAktif}</strong>
                                        {jenisPenilaianAktif === 'PTS' && ' — Hanya PTS yang dapat diinput'}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                {komponenList.map(komponen => {
                                    const isNonPTS = jenisPenilaianAktif === 'PTS' && !/PTS/i.test(komponen.nama);
                                    return (
                                        <div key={komponen.id} className="flex flex-col gap-1.5">
                                            <label className={labelCls} style={labelColor}>
                                                {komponen.nama}
                                                {isNonPTS && <span className="ml-2 text-xs font-normal text-gray-400">(terkunci saat PTS)</span>}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={editingKomponenNilai[komponen.id] ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        setEditingKomponenNilai(prev => ({ ...prev, [komponen.id]: null }));
                                                    } else {
                                                        const numValue = parseInt(val, 10);
                                                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                                            setEditingKomponenNilai(prev => ({ ...prev, [komponen.id]: numValue }));
                                                        }
                                                    }
                                                }}
                                                disabled={isNonPTS}
                                                className={isNonPTS ? inputDisabledCls : inputCls}
                                                placeholder="0–100"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                            <BtnSecondary onClick={closeEditKomponen} disabled={saving}>Batal</BtnSecondary>
                            <button
                                onClick={simpanNilaiKomponen}
                                disabled={saving}
                                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                                style={btnPrimary.style}
                                onMouseEnter={btnPrimary.hover}
                                onMouseLeave={btnPrimary.leave}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>Simpan Nilai</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}