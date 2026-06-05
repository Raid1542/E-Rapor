/**
 * Halaman Siswa Per Kelas
 * Path: /admin/data-kelas/[id]/siswa
 * Fungsi: Menampilkan daftar siswa dalam kelas tertentu dengan CRUD lengkap
 * Update: Field Kelas otomatis terisi & read-only (tidak bisa diubah)
 */

'use client';
import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { X, Plus, Upload, Search, ArrowLeft, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Pencil, Eye, Lock } from 'lucide-react';

// ─── TYPES ──────────────────────────────────────────────────────────────────
type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface Siswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin?: string;
    alamat?: string;
    status: string;
    kelas: string;
    [key: string]: any;
}

interface KelasInfo {
    id_kelas: number;
    nama_kelas: string;
    wali_kelas: string;
    wali_kelas_id: number | null;
    fase: string;
    jumlah_siswa: number;
    tahun_ajaran_id: number;
    is_aktif: boolean;
}

interface FormDataType {
    nama: string;
    kelas: string;
    nis: string;
    nisn: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    alamat: string;
    statusSiswa: string;
    confirmData: boolean;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes ds-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ds-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ds-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ds-fadeIn  { animation: ds-fadeIn  0.2s ease; }
    .ds-scaleIn { animation: ds-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ds-pulse   { animation: ds-pulse   0.6s ease 0.15s; }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ds-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────
const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";
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

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
    const s = (status || 'aktif').toLowerCase();
    const styles: Record<string, { bg: string; color: string; border: string; dot: string }> = {
        'aktif': { bg: '#eaf7ef', color: '#1a7a3a', border: '#b6e8c8', dot: 'bg-green-500' },
        'lulus': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: 'bg-blue-500' },
        'pindah': { bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: 'bg-yellow-500' },
        'drop-out': { bg: '#f5f5f5', color: '#888', border: '#ddd', dot: 'bg-gray-400' },
    };
    return styles[s] || styles['aktif'];
};

const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
    if (s === 'perempuan' || s === 'p') return 'Perempuan';
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

const formatDateInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch { return ''; }
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SiswaPerKelasPage() {
    const { id } = useParams();

    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [kelasList, setKelasList] = useState<{ id: number; nama: string; fase: string }[]>([]);
    const [kelasLoading, setKelasLoading] = useState(false);
    const [formData, setFormData] = useState<FormDataType>({
        nama: '', kelas: '', nis: '', nisn: '', tempatLahir: '', tanggalLahir: '',
        jenisKelamin: '', alamat: '', statusSiswa: 'aktif', confirmData: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);

    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importClosing, setImportClosing] = useState(false);

    // ── FETCH KELAS DROPDOWN ──────────────────────────────────────────────────
    const fetchKelasDropdown = useCallback(async (tahunAjaranId: number) => {
        setKelasLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) { setKelasLoading(false); return; }
            const res = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setKelasList(data.data.map((k: any) => ({
                    id: k.id,
                    nama: k.nama_kelas,
                    fase: k.fase,
                })));
            }
        } catch (err) {
            console.error('Error fetch kelas:', err);
        } finally {
            setKelasLoading(false);
        }
    }, []);

    // ── FETCH SISWA ───────────────────────────────────────────────────────────
    const fetchSiswaByKelas = useCallback(async (kelasId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}/siswa`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSiswaList(data.data.map((s: any) => ({
                    id: s.id_siswa,
                    nama: s.nama_lengkap,
                    nis: s.nis,
                    nisn: s.nisn,
                    tempat_lahir: s.tempat_lahir,
                    tanggal_lahir: s.tanggal_lahir,
                    jenis_kelamin: s.jenis_kelamin,
                    alamat: s.alamat,
                    status: s.status,
                    kelas: s.nama_kelas,
                    ...s
                })));
            }
        } catch (err) {
            console.error('Error fetch siswa:', err);
        }
    }, []);

    // ── FORM HANDLERS ─────────────────────────────────────────────────────────
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'kelas') return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setFormData({
            nama: '',
            kelas: kelasInfo ? String(kelasInfo.id_kelas) : '', nis: '',
            nisn: '',
            tempatLahir: '',
            tanggalLahir: '',
            jenisKelamin: '',
            alamat: '',
            statusSiswa: 'aktif',
            confirmData: false,
        });
        setErrors({});
    };

    const validate = (): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nama?.trim()) ne.nama = 'Nama wajib diisi';
        if (!formData.nis) ne.nis = 'NIS wajib diisi';
        if (!formData.nisn) ne.nisn = 'NISN wajib diisi';
        if (!formData.jenisKelamin) ne.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data';

        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
            return false;
        }
        return true;
    };

    const handleDetail = (siswa: Siswa) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
    };

    const handleEdit = (siswa: Siswa) => {
        setEditId(siswa.id);
        setFormData({
            nama: siswa.nama || '',
            kelas: kelasInfo ? String(kelasInfo.id_kelas) : '',
            nis: siswa.nis || '',
            nisn: siswa.nisn || '',
            tempatLahir: siswa.tempat_lahir || '',
            tanggalLahir: formatDateInput(siswa.tanggal_lahir) || '',
            jenisKelamin: formatGender(siswa.jenis_kelamin) || '',
            alamat: siswa.alamat || '',
            statusSiswa: siswa.status || 'aktif',
            confirmData: false,
        });
        setShowEdit(true);
    };

    const openFormTambah = () => {
        setFormData(prev => ({
            ...prev,
            kelas: kelasInfo ? String(kelasInfo.id_kelas) : '',
        }));
        setShowTambah(true);
    };

    const handleSubmitTambah = async () => {
        if (!validate()) return;
        if (!kelasInfo?.tahun_ajaran_id) {
            showModal({ type: 'warning', title: 'Error', message: 'Tahun ajaran tidak ditemukan.' });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/admin/siswa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn,
                    nama_lengkap: formData.nama,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    kelas_id: Number(formData.kelas),
                    tahun_ajaran_id: kelasInfo.tahun_ajaran_id,
                }),
            });

            if (res.ok) {
                setShowTambah(false);
                handleReset();
                setLoading(true);
                await fetchSiswaByKelas(Number(id));
                setLoading(false);
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data siswa ${formData.nama} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleSubmitEdit = async () => {
        if (!validate()) return;
        if (!kelasInfo?.tahun_ajaran_id) {
            showModal({ type: 'warning', title: 'Error', message: 'Tahun ajaran tidak ditemukan.' });
            return;
        }

        const originalData = siswaList.find(s => s.id === editId);
        if (originalData) {
            const hasChanged =
                formData.nama !== (originalData.nama || '') ||
                formData.nis !== (originalData.nis || '') ||
                formData.nisn !== (originalData.nisn || '') ||
                formData.tempatLahir !== (originalData.tempat_lahir || '') ||
                formData.tanggalLahir !== formatDateInput(originalData.tanggal_lahir) ||
                formData.jenisKelamin !== formatGender(originalData.jenis_kelamin) ||
                formData.alamat !== (originalData.alamat || '') ||
                formData.statusSiswa !== (originalData.status || 'aktif');

            if (!hasChanged) {
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
                return;
            }
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/admin/siswa/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn,
                    nama_lengkap: formData.nama,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    kelas_id: Number(formData.kelas),
                    status: formData.statusSiswa,
                    tahun_ajaran_id: kelasInfo.tahun_ajaran_id,
                }),
            });

            if (res.ok) {
                setShowEdit(false);
                setEditId(null);
                handleReset();
                setLoading(true);
                await fetchSiswaByKelas(Number(id));
                setLoading(false);
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data siswa ${formData.nama} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleImportExcel = async () => {
        if (!importFile) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' });
            return;
        }

        setShowImport(false);
        setImportClosing(true);
        setTimeout(() => setImportClosing(false), 200);

        const fd = new FormData();
        fd.append('file', importFile);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/siswa/import', {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            const result = await res.json();

            setImportFile(null);

            setLoading(true);
            await fetchSiswaByKelas(Number(id));
            setLoading(false);

            if (res.ok) {
                if (result.skipped && result.skipped.length > 0) {
                    const skippedMessages = result.skipped.map((d: any) =>
                        `• Baris ${d.row} (${d.nama})\n  Alasan: ${d.reason}`
                    ).join('\n\n');

                    showModal({
                        type: 'warning',
                        title: 'Import Selesai dengan Peringatan',
                        message: `${result.total} data berhasil diimport.\n\n${result.skipped.length} data dilewati:\n\n${skippedMessages}`
                    });
                } else {
                    showModal({ type: 'success', title: 'Import Berhasil!', message: result.message || `Berhasil mengimport ${result.total} data siswa.` });
                }
            } else {
                let userMessage = result.message || 'Terjadi kesalahan saat mengimpor data siswa.';

                // Deteksi error duplikasi
                if (userMessage.includes('NIS') || userMessage.includes('NISN') || userMessage.includes('duplikat')) {
                    userMessage = '⚠️ Data Duplikat Ditemukan\n\n' + userMessage + '\n\nPastikan NIS dan NISN unik untuk tahun ajaran ini, atau gunakan tahun ajaran yang berbeda.';
                }

                showModal({ type: 'error', title: 'Import Gagal', message: userMessage });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const closeImport = () => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); };

    // ── FETCH DATA AWAL ───────────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !id) {
            showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
            return;
        }

        const kelasId = Number(id);

        fetch(`http://localhost:5000/api/admin/kelas/${kelasId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setKelasInfo({
                        id_kelas: data.data.id_kelas || data.data.id,
                        nama_kelas: data.data.nama_kelas,
                        wali_kelas: data.data.wali_kelas || '-',
                        wali_kelas_id: data.data.wali_kelas_id || null,
                        fase: data.data.fase,
                        jumlah_siswa: data.data.jumlah_siswa || 0,
                        tahun_ajaran_id: data.data.tahun_ajaran_id,
                        is_aktif: data.data.is_aktif || false,
                    });
                    if (data.data.tahun_ajaran_id) {
                        fetchKelasDropdown(data.data.tahun_ajaran_id);
                    }
                }
            })
            .catch(() => {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat mengambil data kelas.' });
            });

        fetchSiswaByKelas(kelasId).finally(() => setLoading(false));
    }, [id, fetchKelasDropdown, fetchSiswaByKelas, showModal]);

    // ── FILTER & SEARCH ───────────────────────────────────────────────────────
    const filteredSiswa = siswaList.filter(siswa => {
        const query = searchQuery.toLowerCase().trim();
        const matchSearch = !query ||
            siswa.nama.toLowerCase().includes(query) ||
            siswa.nis.includes(query) ||
            siswa.nisn.includes(query);
        const matchStatus = filterStatus === 'all' || siswa.status?.toLowerCase() === filterStatus;
        return matchSearch && matchStatus;
    });

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

    // ── RENDER FORM (TAMBAH/EDIT) ─────────────────────────────────────────────
    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            <div className="mb-6">
                <Link
                    href={`/admin/data_kelas_siswa?ta=${kelasInfo?.tahun_ajaran_id || ''}`}
                    className="inline-flex items-center gap-2 text-sm font-bold mb-4 transition-all"
                    style={{ color: '#c95b08' }}
                >
                    <ArrowLeft size={16} />
                    <span>Kembali</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Siswa' : 'Tambah Siswa'}</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelas {kelasInfo?.nama_kelas}</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}</h2>
                    <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <X size={16} className="text-white" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                        <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Nama lengkap"
                            className={errors.nama ? inputErrCls : inputCls} />
                        {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Kelas
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-gray-500">
                                <Lock size={10} /> Otomatis
                            </span>
                        </label>
                        <div
                            className="w-full border rounded-xl px-4 py-2.5 text-sm rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-not-allowed flex items-center justify-between"
                            style={{ borderColor: '#fde0c8' }}
                        >
                            <span>{kelasInfo?.nama_kelas || '-'}</span>
                            <Lock size={14} className="text-gray-400" />
                        </div>
                        {/* Hidden input untuk kirim kelas_id ke backend */}
                        <input type="hidden" name="kelas" value={kelasInfo ? String(kelasInfo.id_kelas) : ''} />
                        <p className="text-xs text-gray-400 mt-1">
                            ℹ️ Siswa akan otomatis ditambahkan ke kelas <strong>{kelasInfo?.nama_kelas}</strong>
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NIS <span className="text-red-500">*</span></label>
                        <input type="text" name="nis" value={formData.nis} onChange={handleInputChange} placeholder="NIS"
                            className={errors.nis ? inputErrCls : inputCls} />
                        {errors.nis && <p className="text-red-500 text-xs">{errors.nis}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NISN <span className="text-red-500">*</span></label>
                        <input type="text" name="nisn" value={formData.nisn} onChange={handleInputChange} placeholder="NISN"
                            className={errors.nisn ? inputErrCls : inputCls} />
                        {errors.nisn && <p className="text-red-500 text-xs">{errors.nisn}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tempat Lahir</label>
                        <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Tempat Lahir" className={inputCls} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Tanggal Lahir</label>
                        <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={inputCls} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                        <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange}
                            className={errors.jenisKelamin ? inputErrCls : inputCls}>
                            <option value="">-- Pilih --</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                        {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
                    </div>

                    {isEdit && (
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Status Siswa <span className="text-red-500">*</span></label>
                            <select name="statusSiswa" value={formData.statusSiswa} onChange={handleInputChange} className={inputCls}>
                                <option value="aktif">Aktif</option>
                                <option value="lulus">Lulus</option>
                                <option value="pindah">Pindah</option>
                                <option value="drop-out">Drop-out</option>
                            </select>
                        </div>
                    )}

                    <div className={`flex flex-col gap-1.5 ${isEdit ? '' : 'md:col-span-2'}`}>
                        <label className={labelCls} style={labelColor}>Alamat</label>
                        <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Alamat lengkap" rows={2} className={inputCls} />
                    </div>
                </div>

                <div className="px-6 pb-4">
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" name="confirmData" checked={formData.confirmData}
                            onChange={e => setFormData(p => ({ ...p, confirmData: e.target.checked }))}
                            className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Saya yakin data yang diisi sudah benar</span>
                    </label>
                    {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
                </div>

                <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>Batal</BtnSecondary>
                    <BtnSecondary onClick={handleReset}>Reset</BtnSecondary>
                    <button onClick={isEdit ? handleSubmitEdit : handleSubmitTambah}
                        className={btnPrimary.base} style={btnPrimary.style}
                        onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                        {isEdit ? 'Simpan Perubahan' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );

    // ── LOADING / FORM STATES ─────────────────────────────────────────────────
    if (kelasLoading) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</span>
                </div>
            </div>
        );
    }

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    // ── MAIN RENDER ───────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-8">
                <Link
                    href={`/admin/data_kelas_siswa?ta=${kelasInfo?.tahun_ajaran_id || ''}`}
                    className="inline-flex items-center gap-2 text-sm font-bold mb-6 transition-all"
                    style={{ color: '#c95b08' }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(-4px)';
                        e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    <ArrowLeft size={18} />
                    <span>Kembali ke Data Kelas</span>
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Kelas {kelasInfo?.nama_kelas || '...'}
                </h1>

                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                        <span className="font-semibold" style={{ color: '#c95b08' }}>Guru Kelas:</span>
                        <span className="font-semibold" style={{ color: '#7a3a0a' }}>{kelasInfo?.wali_kelas || '-'}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full" style={{ background: '#c95b08', opacity: 0.4 }} />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                        <span className="font-semibold" style={{ color: '#c95b08' }}>Fase:</span>
                        <span className="font-semibold" style={{ color: '#7a3a0a' }}>{kelasInfo?.fase || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {kelasInfo?.is_aktif && (
                            <button className={btnPrimary.base} style={btnPrimary.style}
                                onClick={openFormTambah}
                                onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                                <Plus size={16} /> Tambah Siswa
                            </button>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200">
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <select value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200">
                                <option value="all">Semua Status</option>
                                <option value="aktif">Aktif</option>
                                <option value="lulus">Lulus</option>
                                <option value="pindah">Pindah</option>
                                <option value="drop-out">Drop-out</option>
                            </select>

                            {kelasInfo?.is_aktif && (
                                <button onClick={() => setShowImport(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                                    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                    <Upload size={15} /> Import Siswa
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Status', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        Memuat data...
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                                    {searchQuery || filterStatus !== 'all' ? 'Tidak ada siswa yang sesuai filter' : 'Belum ada siswa di kelas ini'}
                                </td></tr>
                            ) : currentSiswa.map((siswa, index) => {
                                const badge = getStatusBadge(siswa.status);
                                return (
                                    <tr key={siswa.id}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                        <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${badge.dot}`} />
                                                {(siswa.status || 'AKTIF').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleDetail(siswa)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                    <Eye size={13} /> Detail
                                                </button>
                                                {kelasInfo?.is_aktif && (
                                                    <button onClick={() => handleEdit(siswa)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                                        <Pencil size={13} /> Edit
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* ── MODAL DETAIL ──────────────────────────────────────────────── */}
            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Siswa</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col items-center mb-8">
                                <h3 className="text-lg font-bold text-gray-800">{selectedSiswa.nama}</h3>
                            </div>

                            <div className="space-y-2.5">
                                {[
                                    {
                                        label: 'Status', value: (() => {
                                            const badge = getStatusBadge(selectedSiswa.status);
                                            return (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${badge.dot}`} />
                                                    {(selectedSiswa.status || 'AKTIF').toUpperCase()}
                                                </span>
                                            );
                                        })()
                                    },
                                    { label: 'Kelas', value: selectedSiswa.kelas || '-' },
                                    { label: 'NIS', value: selectedSiswa.nis || '-' },
                                    { label: 'NISN', value: selectedSiswa.nisn || '-' },
                                    { label: 'Jenis Kelamin', value: formatGender(selectedSiswa.jenis_kelamin) },
                                    { label: 'Tempat Lahir', value: selectedSiswa.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedSiswa.tanggal_lahir) },
                                    { label: 'Alamat', value: selectedSiswa.alamat || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2 pb-2.5 items-center" style={{ borderBottom: '1px solid #fde0c8' }}>
                                        <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                                        <span className="text-xs text-gray-700 col-span-1">:</span>
                                        <div className="col-span-2 flex items-center">
                                            <span className="text-xs text-gray-700 break-words">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                                {kelasInfo?.is_aktif && (
                                    <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                                        className={btnPrimary.base} style={btnPrimary.style}
                                        onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                                        <Pencil size={14} /> Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL IMPORT ──────────────────────────────────────────────── */}
            {showImport && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeImport(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Import Data Siswa</h2>
                            <button onClick={closeImport} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm mb-3" style={{ color: '#7a3a0a' }}>
                                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
                            </p>
                            <div className="mb-4">
                                <a href="http://localhost:5000/templates/template_import_siswa.xlsx" download
                                    className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: '#e8690a' }}>
                                    📥 Unduh template Excel
                                </a>
                                <p className="text-xs text-gray-400 mt-1">Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong></p>
                            </div>

                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors"
                                style={{ border: '2px dashed #fde0c8', background: '#fffaf6' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fffaf6')}>
                                <Upload className="w-8 h-8 mb-2" style={{ color: '#e8690a' }} />
                                <p className="text-sm">
                                    {importFile
                                        ? <span className="font-semibold" style={{ color: '#c95b08' }}>{importFile.name}</span>
                                        : <span className="text-gray-400">Klik untuk pilih file</span>}
                                </p>
                                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>

                            <div className="flex gap-3 mt-5">
                                <button onClick={handleImportExcel} disabled={!importFile}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${!importFile ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: importFile ? '0 3px 10px rgba(232,105,10,0.25)' : 'none' }}>
                                    Import
                                </button>
                                <BtnSecondary onClick={closeImport}>Batal</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}