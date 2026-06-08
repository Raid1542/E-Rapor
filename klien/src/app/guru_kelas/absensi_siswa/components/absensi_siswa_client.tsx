/**
 * Nama File: absensi_siswa_client.tsx
 * Fungsi: Komponen client-side untuk mengelola absensi siswa oleh guru kelas.
 *         Menampilkan daftar siswa dengan opsi input/edit jumlah sakit, izin, dan alpha.
 * Pembuat:Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SiswaAbsensi {
    id: number;
    id_absensi: number | null;
    nama: string;
    nis: string;
    nisn: string;
    jumlah_sakit: number;
    jumlah_izin: number;
    jumlah_alpha: number;
    sudah_diinput: boolean;
}

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

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

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} in-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG     = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataAbsensiPage() {
    const [siswaList, setSiswaList]               = useState<SiswaAbsensi[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [editingId, setEditingId]               = useState<number | null>(null);
    const [editData, setEditData]                 = useState({ jumlah_sakit: '0', jumlah_izin: '0', jumlah_alpha: '0' });
    const [originalEditData, setOriginalEditData] = useState({ jumlah_sakit: '0', jumlah_izin: '0', jumlah_alpha: '0' });
    const [searchQuery, setSearchQuery]           = useState('');
    const [itemsPerPage, setItemsPerPage]         = useState(10);
    const [currentPage, setCurrentPage]           = useState(1);
    const [kelasNama, setKelasNama]               = useState<string>('Kelas Anda');
    const [showModal, setShowModal]               = useState(false);
    const [isModalClosing, setIsModalClosing]     = useState(false);
    const [saving, setSaving]                     = useState(false);
    const [semester, setSemester]                 = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [jenisPenilaian, setJenisPenilaian]     = useState<'PTS' | 'PAS'>('PAS');

    // Notif modal
    const [notif, setNotif]      = useState<ModalConfig | null>(null);
    const showNotif  = useCallback((cfg: ModalConfig) => setNotif(cfg), []);
    const closeNotif = useCallback(() => setNotif(null), []);

    // ── Load data ──────────────────────────────────────────────────────────────

    useEffect(() => {
        const loadData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotif({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login terlebih dahulu.' });
                return;
            }
            try {
                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!taRes.ok) {
                    const err = await taRes.json();
                    showNotif({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat periode aktif.' });
                    return;
                }
                const taData = await taRes.json();
                const { semester: sem, status_pts, status_pas } = taData.data;
                const jenis: 'PTS' | 'PAS' = status_pts === 'aktif' ? 'PTS' : 'PAS';
                setSemester(sem);
                setJenisPenilaian(jenis);
                await fetchAbsensi(sem, jenis, token);
            } catch (err) {
                console.error('Error load data:', err);
                showNotif({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server. Periksa koneksi Anda.' });
            }
        };
        loadData();
    }, []);

    const fetchAbsensi = async (sem: string, jenis: string, token: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/guru-kelas/absensi/${jenis}/${sem}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                } else {
                    showNotif({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data absensi.' });
                }
            } else {
                const error = await res.json();
                showNotif({ type: 'error', title: 'Gagal Memuat', message: error.message || 'Gagal memuat data absensi.' });
            }
        } catch (err) {
            console.error('Error fetch absensi:', err);
            showNotif({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    // ── Edit & Save ────────────────────────────────────────────────────────────

    const handleEdit = (siswa: SiswaAbsensi) => {
        const initial = {
            jumlah_sakit:  siswa.jumlah_sakit.toString(),
            jumlah_izin:   siswa.jumlah_izin.toString(),
            jumlah_alpha:  siswa.jumlah_alpha.toString(),
        };
        setEditingId(siswa.id);
        setEditData(initial);
        setOriginalEditData(initial);
        setShowModal(true);
        setIsModalClosing(false);
    };

    const handleCloseModal = () => {
        setIsModalClosing(true);
        setTimeout(() => { setShowModal(false); setIsModalClosing(false); setEditingId(null); }, 200);
    };

    const handleSave = async () => {
        if (!editingId) return;

        const hasChanges =
            editData.jumlah_sakit !== originalEditData.jumlah_sakit ||
            editData.jumlah_izin  !== originalEditData.jumlah_izin  ||
            editData.jumlah_alpha !== originalEditData.jumlah_alpha;

        if (!hasChanges) {
            showNotif({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data absensi tidak berubah.' });
            handleCloseModal();
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showNotif({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login kembali.' });
            return;
        }

        const sakit = editData.jumlah_sakit === '' ? 0 : Number(editData.jumlah_sakit);
        const izin  = editData.jumlah_izin   === '' ? 0 : Number(editData.jumlah_izin);
        const alpha = editData.jumlah_alpha  === '' ? 0 : Number(editData.jumlah_alpha);

        // Validasi maksimum
        if (sakit > 180 || izin > 180 || alpha > 180) {
            showNotif({
                type: 'warning',
                title: 'Nilai Tidak Valid',
                message: 'Nilai sakit, izin, dan alpha tidak boleh lebih dari 180.',
            });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`http://localhost:5000/api/guru-kelas/absensi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    id_siswa: editingId,
                    sakit,
                    izin,
                    alpha,
                }),
            });
            if (res.ok) {
                setSiswaList(prev => prev.map(s =>
                    s.id === editingId
                        ? { ...s, jumlah_sakit: sakit, jumlah_izin: izin, jumlah_alpha: alpha, sudah_diinput: true }
                        : s
                ));
                handleCloseModal();
                showNotif({ type: 'success', title: 'Berhasil Disimpan!', message: 'Data absensi siswa berhasil diperbarui.' });
            } else {
                const err = await res.json();
                showNotif({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan data absensi.' });
            }
        } catch (err) {
            showNotif({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (value === '' || /^\d*$/.test(value)) {
            setEditData(prev => ({ ...prev, [name]: value }));
        }
    };

    // ── Filter & Pagination ────────────────────────────────────────────────────

    const filteredSiswa = siswaList.filter(siswa => {
        const q = searchQuery.toLowerCase().trim();
        return !q || siswa.nama.toLowerCase().includes(q) || siswa.nis.includes(q) || siswa.nisn.includes(q);
    });

    const totalPages   = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex   = (currentPage - 1) * itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, startIndex + itemsPerPage);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive   = "text-white border-orange-500";
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
        range.forEach(p => {
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

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {notif && <NotifModal modal={notif} onClose={closeNotif} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Absensi Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola data kehadiran siswa per periode penilaian
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

                        {/* Info kelas & periode */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                                Kelas: <strong>{kelasNama}</strong>
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                Periode: {jenisPenilaian} — Semester {semester}
                            </span>
                        </div>

                        {/* Kanan: items per page + search */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span className="text-xs font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama, NIS, atau NISN..."
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-xs" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                    </p>
                </div>

                {/* Tabel */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Sakit', 'Izin', 'Alpha', 'Aksi'].map(h => (
                                    <th key={h} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            Memuat data absensi...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="text-3xl">📋</span>
                                            <span className="text-sm">Tidak ada data siswa</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentSiswa.map((siswa, idx) => (
                                    <tr key={siswa.id}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}
                                    >
                                        <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>

                                        {/* Sakit / Izin / Alpha */}
                                        {(['jumlah_sakit', 'jumlah_izin', 'jumlah_alpha'] as const).map(field => (
                                            <td key={field} className="px-4 py-3 text-center">
                                                {siswa.sudah_diinput ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                                                        style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                        {siswa[field]}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300">Belum isi</span>
                                                )}
                                            </td>
                                        ))}

                                        {/* Aksi */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => handleEdit(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={siswa.sudah_diinput
                                                    ? { background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }
                                                    : { background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }
                                                }
                                                onMouseEnter={e => (e.currentTarget.style.background = siswa.sudah_diinput ? '#ffe4c8' : '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = siswa.sudah_diinput ? '#fff0e5' : '#eaf7ef')}
                                            >
                                                <Pencil size={12} />
                                                {siswa.sudah_diinput ? 'Edit' : 'Isi Absensi'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredSiswa.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <div className="flex items-center gap-1">{renderPagination()}</div>
                    </div>
                )}
            </div>

            {/* ── Modal Edit Absensi ─────────────────────────────────────────────── */}
            {showModal && editingId !== null && (() => {
                const siswa = siswaList.find(s => s.id === editingId);
                if (!siswa) return null;
                return (
                    <div
                        className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
                        onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                        <div
                            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${isModalClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                            style={CARD_STYLE}
                        >
                            {/* Header */}
                            <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                                <h2 className="text-base font-bold text-white">
                                    {siswa.sudah_diinput ? 'Edit Absensi' : 'Isi Absensi'}
                                </h2>
                                <button onClick={handleCloseModal}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                                    <X size={16} className="text-white" />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Info siswa */}
                                <div className="rounded-xl p-3 mb-5" style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                    <p className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>Siswa</p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{siswa.nama}</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                                        Periode: {jenisPenilaian} — Semester {semester}
                                    </p>
                                </div>

                                {/* Input fields */}
                                <div className="space-y-4 mb-6">
                                    {[
                                        { label: 'Sakit', name: 'jumlah_sakit' },
                                        { label: 'Izin',  name: 'jumlah_izin' },
                                        { label: 'Alpha', name: 'jumlah_alpha' },
                                    ].map(({ label, name }) => (
                                        <div key={name}>
                                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                {label}
                                            </label>
                                            <input
                                                type="number"
                                                name={name}
                                                value={editData[name as keyof typeof editData]}
                                                onChange={handleChange}
                                                onKeyDown={e => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                                                min="0" max="180" step="1"
                                                className="w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                                        onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                        onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : 'Simpan'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}