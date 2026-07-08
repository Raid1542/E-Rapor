/**
 * Nama File: absensi_client.tsx
 * Fungsi: Komponen klien untuk mengelola absensi siswa (PTS & PAS)
 * UPDATE: 
 *   ✅ FIX: Hapus pengecekan NOT_ASSIGNED di fetchTahunAjaran
 *   ✅ FIX: Perbaiki operator precedence di useEffect refetch
 *   ✅ FIX: Handle setLoading(false) di semua case fetchAbsensi
 *   🆕 BARU: Fitur Import Absensi dari Excel
 *   🆕 BARU: Auto-download CSV error report jika error > 4
 *   - Kondisi 1: Modal "Akses Ditolak" + Logout jika belum ditugaskan
 *   - Kondisi 2: Read-Only mode jika jenis penilaian belum aktif
 *   - Tab PTS/PAS menunjukkan status (Aktif/Menunggu/Selesai)
 *   - Semester otomatis dari tahun ajaran aktif
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Search, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, Users,
    Info, Edit3, Check, School, Lock, LogOut,
    Upload, Download
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface SiswaAbsensi {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
    sakit: number;
    izin: number;
    alpha: number;
    sudah_diinput: boolean;
    pts_sakit?: number;
    pts_izin?: number;
    pts_alpha?: number;
}

interface AbsensiData {
    kelas_id: number;
    kelas: string;
    jenis_penilaian: 'PTS' | 'PAS';
    semester: string;
    absensi: SiswaAbsensi[];
    total: number;
}

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes ab-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ab-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ab-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .ab-fadeIn  { animation: ab-fadeIn  0.2s ease; }
        .ab-scaleIn { animation: ab-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .ab-pulse   { animation: ab-pulse   0.6s ease 0.15s; }
    `}</style>
);

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 ab-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ab-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ab-pulse`}>{s.icon}</div>
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

// ─── STYLE CONSTANTS ──────────────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm text-center text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white border-orange-200";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AbsensiClient() {
    const API_BASE = 'http://localhost:5000/api/guru-kelas';
    const { showSessionExpired, handleLogout } = useSession();

    // ── State ──────────────────────────────────────────────────────────────
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PTS');
    const [absensiData, setAbsensiData] = useState<AbsensiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
    const [editedData, setEditedData] = useState<Record<number, { sakit: number; izin: number; alpha: number }>>({});
    const [savingRows, setSavingRows] = useState<Set<number>>(new Set());

    // ✅ STATE: Kondisi akses
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [semesterAktif, setSemesterAktif] = useState<string>('Ganjil');

    // 🆕 BARU: STATE untuk Import Absensi
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    // ── Modal state ────────────────────────────────────────────────────────
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState<{ siswaId: number; data: any } | null>(null);

    // ── Fetch Tahun Ajaran Aktif ───────────────────────────────────────────
    const fetchTahunAjaran = useCallback(async (token: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
                return false;
            }

            if (!res.ok) {
                console.error('❌ fetchTahunAjaran gagal:', res.status);
                return false;
            }

            const result = await res.json();
            if (result.success && result.data) {
                const ta = result.data;
                const ptsStatus = ta.status_pts || 'nonaktif';
                const pasStatus = ta.status_pas || 'nonaktif';

                setStatusPTS(ptsStatus);
                setStatusPAS(pasStatus);
                setSemesterAktif(ta.semester || 'Ganjil');

                if (ptsStatus === 'aktif') {
                    setJenisPenilaian('PTS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (pasStatus === 'aktif') {
                    setJenisPenilaian('PAS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else {
                    setJenisPenilaian('PTS');
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: '⏳ Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data absensi, tetapi belum dapat mengedit.\n\n💡 Tip: Silakan hubungi Administrator untuk membuka periode penilaian.'
                        });
                    }, 500);
                }

                return true;
            }
            return false;
        } catch (err) {
            console.error('Error fetch tahun ajaran:', err);
            return false;
        }
    }, [showModal]);

    // ── Fetch Data Absensi ─────────────────────────────────────────────────
    const fetchAbsensi = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                setLoading(false);
                return;
            }

            const semester = semesterAktif;
            const res = await fetch(`${API_BASE}/absensi/${jenisPenilaian}/${semester}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ code: 'UNKNOWN', message: 'Gagal memuat data' }));

                if (errData.code === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                    setLoading(false);
                    return;
                } else if (errData.code === 'PERIOD_NOT_OPEN') {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setAbsensiData(null);
                    setLoading(false);
                    return;
                } else if (errData.code === 'PERIOD_LOCKED') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    setAbsensiData(null);
                    setLoading(false);
                    return;
                }

                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data',
                    message: errData.message || 'Terjadi kesalahan saat memuat data absensi.'
                });
                setLoading(false);
                return;
            }

            const result = await res.json();

            if (result.success) {
                setAbsensiData(result.data);
                setIsNotAssigned(false);
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data',
                    message: result.message || 'Terjadi kesalahan saat memuat data absensi.'
                });
            }
        } catch (err) {
            console.error('Error fetch absensi:', err);
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
            });
        } finally {
            setLoading(false);
        }
    }, [jenisPenilaian, semesterAktif, showModal]);

    // ── Initial Load ───────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                setLoading(false);
                return;
            }

            const success = await fetchTahunAjaran(token);
            
            if (success) {
                await fetchAbsensi();
            } else {
                setLoading(false);
                showModal({
                    type: 'network',
                    title: 'Gagal Memuat Data',
                    message: 'Tidak dapat memuat data tahun ajaran. Silakan refresh halaman.'
                });
            }
        };
        init();
    }, []);

    // ── Refetch saat jenis penilaian berubah ───────────────────────────────
    useEffect(() => {
        if (isNotAssigned) return;
        if (loading && !absensiData) return;
        fetchAbsensi();
    }, [jenisPenilaian]);

    // ── Warning sebelum unload jika ada perubahan ──────────────────────────
    useEffect(() => {
        const hasUnsavedChanges = editingRows.size > 0;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [editingRows]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleEdit = (siswaId: number) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit data absensi.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: '⏳ Mode Baca Saja',
                    message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit data absensi.\n\nSilakan tunggu admin membuka periode penilaian.'
                });
            }
            return;
        }

        setEditingRows(prev => new Set(prev).add(siswaId));

        const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
        if (siswa) {
            setEditedData(prev => ({
                ...prev,
                [siswaId]: {
                    sakit: siswa.sakit || 0,
                    izin: siswa.izin || 0,
                    alpha: siswa.alpha || 0
                }
            }));
        }
    };

    const handleCancelEdit = (siswaId: number) => {
        setEditingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(siswaId);
            return newSet;
        });
        setEditedData(prev => {
            const newData = { ...prev };
            delete newData[siswaId];
            return newData;
        });
    };

    const handleInputChange = (siswaId: number, field: 'sakit' | 'izin' | 'alpha', value: string) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setEditedData(prev => ({
            ...prev,
            [siswaId]: {
                ...prev[siswaId],
                [field]: numValue
            }
        }));
    };

    // ── Validasi Input ─────────────────────────────────────────────────────
    const validateInput = (siswaId: number): string | null => {
        const data = editedData[siswaId];
        if (!data) return 'Data tidak valid';

        if (data.sakit < 0 || data.izin < 0 || data.alpha < 0) {
            return 'Nilai absensi tidak boleh negatif';
        }

        const MAX_ABSEN = 90;
        if (data.sakit > MAX_ABSEN || data.izin > MAX_ABSEN || data.alpha > MAX_ABSEN) {
            return `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari`;
        }

        const totalHari = data.sakit + data.izin + data.alpha;
        if (totalHari > MAX_ABSEN) {
            return `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari`;
        }

        if (jenisPenilaian === 'PAS') {
            const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
            if (siswa && siswa.sudah_diinput) {
                if (data.sakit < (siswa.pts_sakit || 0)) {
                    return `Total sakit (${data.sakit}) tidak boleh kurang dari PTS (${siswa.pts_sakit})`;
                }
                if (data.izin < (siswa.pts_izin || 0)) {
                    return `Total izin (${data.izin}) tidak boleh kurang dari PTS (${siswa.pts_izin})`;
                }
                if (data.alpha < (siswa.pts_alpha || 0)) {
                    return `Total alpha (${data.alpha}) tidak boleh kurang dari PTS (${siswa.pts_alpha})`;
                }
            }
        }

        return null;
    };

    const hasChanges = (siswaId: number): boolean => {
        const siswa = absensiData?.absensi?.find(s => s.id_siswa === siswaId);
        const edited = editedData[siswaId];

        if (!siswa || !edited) return false;

        return (
            edited.sakit !== siswa.sakit ||
            edited.izin !== siswa.izin ||
            edited.alpha !== siswa.alpha
        );
    };

    const openConfirmModal = (siswaId: number) => {
        if (!hasChanges(siswaId)) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Data absensi tidak berubah. Tidak perlu menyimpan.'
            });
            return;
        }

        const validationError = validateInput(siswaId);
        if (validationError) {
            showModal({ type: 'error', title: 'Validasi Gagal', message: validationError });
            return;
        }

        setConfirmData({ siswaId, data: editedData[siswaId] });
        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        if (!confirmData) return;

        const { siswaId, data } = confirmData;

        try {
            setSavingRows(prev => new Set(prev).add(siswaId));

            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
                return;
            }

            const semester = semesterAktif;
            const res = await fetch(`${API_BASE}/absensi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    siswa_id: siswaId,
                    kelas_id: absensiData?.kelas_id,
                    sakit: data.sakit,
                    izin: data.izin,
                    alpha: data.alpha,
                    jenis: jenisPenilaian,
                    semester: semesterAktif
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setAbsensiData(prev => {
                    if (!prev?.absensi) return prev;
                    const newAbsensi = prev.absensi.map(s =>
                        s.id_siswa === siswaId
                            ? { ...s, sakit: data.sakit, izin: data.izin, alpha: data.alpha, sudah_diinput: true }
                            : s
                    );
                    return { ...prev, absensi: newAbsensi };
                });

                handleCancelEdit(siswaId);

                showModal({
                    type: 'success',
                    title: 'Berhasil Disimpan!',
                    message: `Absensi ${jenisPenilaian} berhasil disimpan.`
                });
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: result.message || 'Terjadi kesalahan saat menyimpan data.'
                });
            }
        } catch (err) {
            console.error('Error save absensi:', err);
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server.'
            });
        } finally {
            setSavingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(siswaId);
                return newSet;
            });
            setShowConfirmModal(false);
            setConfirmData(null);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: IMPORT ABSENSI HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    const openImportModal = () => {
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport data absensi.'
                    : 'Periode penilaian belum aktif.\n\nAnda tidak dapat mengimport data absensi.'
            });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/absensi/import-template?jenis=${jenisPenilaian}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Gagal download template' }));
                throw new Error(err.message || 'Gagal download template');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Template_Absensi_${absensiData?.kelas.replace(/[^a-z0-9]/gi, '_') || 'Kelas'}_${jenisPenilaian}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({
                type: 'success',
                title: 'Template Berhasil Diunduh',
                message: 'Template Excel berhasil diunduh.\n\n📝 Langkah selanjutnya:\n1. Buka file Excel\n2. Isi data absensi (Sakit, Izin, Alpha)\n3. Simpan file\n4. Upload kembali melalui tombol "Import Absensi"'
            });
        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh Template',
                message: err.message || 'Terjadi kesalahan saat mengunduh template.'
            });
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            showModal({
                type: 'warning',
                title: 'Format File Tidak Valid',
                message: 'Silakan upload file Excel (.xlsx atau .xls)'
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showModal({
                type: 'warning',
                title: 'File Terlalu Besar',
                message: 'Ukuran file maksimal 10MB'
            });
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
            return;
        }

        setImportFile(file);
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: FUNGSI DOWNLOAD ERROR REPORT ABSENSI (CSV)
    // Generate file CSV berisi detail error import absensi
    // Format: No, Baris, Sakit, Izin, Alpha, Alasan Error
    // ═════════════════════════════════════════════════════════════════════════

    const downloadErrorReportAbsensi = (errors: any[]) => {
        // Header CSV
        const headers = ['No', 'Baris', 'Sakit', 'Izin', 'Alpha', 'Alasan Error'];

        // Parse error message untuk extract data
        const rows = errors.map((err, index) => {
            const message = err.message || '';

            // Extract baris dari message (format: "Baris X: ..." atau "Baris X, ...")
            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const rowNumber = rowMatch ? rowMatch[1] : '-';

            // Extract nilai sakit (format: "Sakit: X" atau "Total sakit (X)")
            const sakitMatch = message.match(/(?:Sakit|Total sakit)\s*[\(:]\s*(\d+)/i);
            const sakit = sakitMatch ? sakitMatch[1] : '-';

            // Extract nilai izin (format: "Izin: X" atau "Total izin (X)")
            const izinMatch = message.match(/(?:Izin|Total izin)\s*[\(:]\s*(\d+)/i);
            const izin = izinMatch ? izinMatch[1] : '-';

            // Extract nilai alpha (format: "Alpha: X" atau "Total alpha (X)")
            const alphaMatch = message.match(/(?:Alpha|Total alpha)\s*[\(:]\s*(\d+)/i);
            const alpha = alphaMatch ? alphaMatch[1] : '-';

            // Escape quotes untuk CSV (double quote menjadi "")
            const escapedMessage = message.replace(/"/g, '""');

            return [
                index + 1,
                rowNumber,
                sakit,
                izin,
                alpha,
                `"${escapedMessage}"`
            ].join(',');
        });

        // Build CSV content dengan BOM untuk UTF-8 (agar Excel baca dengan benar)
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows
        ].join('\n');

        // Generate blob dan download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // Generate filename dengan timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `error_import_absensi_${jenisPenilaian}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const executeImport = async () => {
        if (!importFile) {
            showModal({
                type: 'warning',
                title: 'File Belum Dipilih',
                message: 'Silakan pilih file Excel yang akan diimport.'
            });
            return;
        }

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', importFile);

            const response = await fetch(`${API_BASE}/absensi/import?jenis=${jenisPenilaian}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengimport absensi');
            }

            // Refresh data absensi
            await fetchAbsensi();

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            // ═════════════════════════════════════════════════════════════════
            // 🆕 BARU: AUTO-DOWNLOAD CSV JIKA ERROR > 4
            // ═════════════════════════════════════════════════════════════════
            const errors = data.data?.errors || [];
            const totalErrors = errors.length;

            // Auto-download CSV jika error > 4
            if (totalErrors > 4) {
                downloadErrorReportAbsensi(errors);
            }

            // Build success message
            let successMessage = data.message;
            
            if (totalErrors > 0) {
                if (totalErrors <= 4) {
                    // Jika error <= 4, tampilkan semua di modal
                    successMessage += `\n\n📋 Detail Error:\n${errors.map((e: any) => `• ${e.message}`).join('\n')}`;
                } else {
                    // Jika error > 4, tampilkan 3 contoh + info CSV
                    successMessage += `\n\n📋 Contoh Error (3 dari ${totalErrors}):\n${errors.slice(0, 3).map((e: any) => `• ${e.message}`).join('\n')}`;
                    successMessage += `\n\n📥 File CSV error telah diunduh otomatis!\n   (error_import_absensi_${jenisPenilaian}_*.csv)`;
                }
            }

            setTimeout(() => {
                showModal({
                    type: totalErrors > 0 ? 'warning' : 'success',
                    title: totalErrors > 0 ? 'Import Selesai (Ada Error)' : 'Import Berhasil!',
                    message: successMessage
                });
            }, 250);

        } catch (err: any) {
            showModal({
                type: 'error',
                title: 'Gagal Import',
                message: err.message || 'Terjadi kesalahan saat mengimport absensi.'
            });
        } finally {
            setImporting(false);
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────
    const filteredAbsensi = (absensiData?.absensi ?? []).filter(siswa => {
        const query = searchQuery.toLowerCase();
        return (
            siswa.nama.toLowerCase().includes(query) ||
            siswa.nis.toLowerCase().includes(query) ||
            siswa.nisn.toLowerCase().includes(query)
        );
    });

    // ── Helper: Status Tab ─────────────────────────────────────────────────
    const getTabStatus = (jenis: 'PTS' | 'PAS') => {
        return jenis === 'PTS' ? statusPTS : statusPAS;
    };

    const handleTabChange = (jenis: 'PTS' | 'PAS') => {
        const status = getTabStatus(jenis);

        console.log(`🔄 [Tab Change] Pindah ke ${jenis}, status: ${status}`);

        if (editingRows.size > 0) {
            setEditingRows(new Set());
            setEditedData({});
            console.log('🗑️ [Tab Change] Clear editing rows');
        }

        if (status === 'nonaktif') {
            showModal({
                type: 'warning',
                title: '⏳ Periode Belum Aktif',
                message: `Periode ${jenis} belum dibuka oleh admin.\n\nSilakan tunggu admin membuka periode ${jenis}.`
            });
            return;
        }

        if (status === 'selesai') {
            setJenisPenilaian(jenis);
            setIsReadOnly(true);
            setReadOnlyReason('locked');
            showModal({
                type: 'warning',
                title: 'Periode Selesai',
                message: `Periode ${jenis} sudah selesai.\n\nAnda hanya dapat melihat data dalam mode baca saja.`
            });
            return;
        }

        console.log(`✅ [Tab Change] ${jenis} aktif, enable edit mode`);
        setJenisPenilaian(jenis);
        setIsReadOnly(false);
        setReadOnlyReason(null);
    };

    // ── Render: Akses Ditolak ──────────────────────────────────────────────
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ab-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ab-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ab-pulse">
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

    // ── Render Utama ───────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Absensi Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola data kehadiran siswa untuk {absensiData?.kelas || 'kelas Anda'}
                </p>
            </div>

            {/* ✅ BANNER READ-ONLY */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                        background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`
                    }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
                            Mode Baca Saja (Read Only)
                        </p>
                        <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat data absensi, tetapi tidak dapat mengedit.'
                                : 'Periode penilaian belum aktif. Anda dapat melihat data absensi, tetapi belum dapat mengedit. Silakan hubungi admin untuk membuka periode penilaian.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card Header - Minimalis */}
                <div className="px-6 py-5" style={HEADER_GRAD}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center backdrop-blur-sm shadow-lg">
                            <School className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {absensiData?.kelas || 'Memuat...'}
                            </h2>
                            <p className="text-xs text-white/80 mt-0.5">
                                Semester {semesterAktif}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Toggle PTS/PAS dengan Status */}
                <div className="px-5 py-3" style={{ background: '#fffaf6', borderBottom: '1px solid #fde0c8' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Periode:</span>
                        <div className="flex gap-2 bg-white rounded-lg p-1" style={{ border: '1px solid #fde0c8' }}>
                            {/* Tab PTS */}
                            <button
                                onClick={() => handleTabChange('PTS')}
                                className="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex flex-col items-center gap-0.5 min-w-[80px]"
                                style={{
                                    background: jenisPenilaian === 'PTS'
                                        ? '#c95b08'
                                        : statusPTS === 'aktif'
                                            ? 'rgba(201,91,8,0.1)'
                                            : statusPTS === 'selesai'
                                                ? 'rgba(156,163,175,0.1)'
                                                : 'transparent',
                                    color: jenisPenilaian === 'PTS'
                                        ? '#fff'
                                        : statusPTS === 'aktif'
                                            ? '#c95b08'
                                            : statusPTS === 'selesai'
                                                ? '#6b7280'
                                                : '#9ca3af',
                                    cursor: statusPTS !== 'nonaktif' ? 'pointer' : 'not-allowed',
                                    opacity: statusPTS === 'nonaktif' ? 0.6 : 1
                                }}
                            >
                                <span>PTS</span>
                                <span className="text-[9px] font-normal">
                                    {statusPTS === 'aktif' ? '● Aktif' : statusPTS === 'selesai' ? '✓ Selesai' : '⏳ Menunggu'}
                                </span>
                            </button>

                            {/* Tab PAS */}
                            <button
                                onClick={() => handleTabChange('PAS')}
                                className="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex flex-col items-center gap-0.5 min-w-[80px]"
                                style={{
                                    background: jenisPenilaian === 'PAS'
                                        ? '#c95b08'
                                        : statusPAS === 'aktif'
                                            ? 'rgba(201,91,8,0.1)'
                                            : statusPAS === 'selesai'
                                                ? 'rgba(156,163,175,0.1)'
                                                : 'transparent',
                                    color: jenisPenilaian === 'PAS'
                                        ? '#fff'
                                        : statusPAS === 'aktif'
                                            ? '#c95b08'
                                            : statusPAS === 'selesai'
                                                ? '#6b7280'
                                                : '#9ca3af',
                                    cursor: statusPAS !== 'nonaktif' ? 'pointer' : 'not-allowed',
                                    opacity: statusPAS === 'nonaktif' ? 0.6 : 1
                                }}
                            >
                                <span>PAS</span>
                                <span className="text-[9px] font-normal">
                                    {statusPAS === 'aktif' ? '● Aktif' : statusPAS === 'selesai' ? '✓ Selesai' : '⏳ Menunggu'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Box untuk PAS - Hanya jika PAS aktif */}
                {jenisPenilaian === 'PAS' && statusPAS === 'aktif' && (
                    <div className="mx-5 mt-4 p-4 rounded-xl flex items-start gap-3"
                        style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#c95b08' }} />
                        <div className="flex-1">
                            <p className="text-sm font-bold mb-1" style={{ color: '#7a3a0a' }}>
                                Input Total Absensi Semester
                            </p>
                            <p className="text-xs" style={{ color: '#c95b08' }}>
                                Untuk PAS, input total absensi selama 1 semester penuh.
                                Total harus lebih besar atau sama dengan data PTS yang sudah diinput sebelumnya.
                            </p>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-5 py-4 mt-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" style={{ color: '#c95b08' }} />
                            <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                Total: {filteredAbsensi.length} siswa
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* 🆕 BARU: Tombol Import Absensi */}
                            {!isReadOnly && (
                                <button
                                    onClick={openImportModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg,#10b981,#059669)',
                                        boxShadow: '0 3px 12px rgba(16,185,129,0.3)'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#059669,#047857)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#10b981,#059669)')}
                                >
                                    <Upload size={16} />
                                    Import Absensi
                                </button>
                            )}

                            {/* Search */}
                            <div className="relative min-w-[200px] sm:min-w-[250px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama atau NIS..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2 flex items-center"
                                        style={{ color: '#c95b08' }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-12">No.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-white">Nama Siswa</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-24">NIS</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-24">Sakit</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-24">Izin</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-24">Alpha</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            Memuat data...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAbsensi.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                                                <Users size={32} style={{ color: '#e8690a' }} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-700 mb-1">
                                                    {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                                </p>
                                                <p className="text-xs text-gray-500 max-w-md mx-auto">
                                                    {searchQuery
                                                        ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                                                        : `Belum ada siswa yang terdaftar di kelas Anda.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAbsensi.map((siswa, index) => {
                                    const isEditing = editingRows.has(siswa.id_siswa);
                                    const isSaving = savingRows.has(siswa.id_siswa);
                                    const editedValues = editedData[siswa.id_siswa];

                                    return (
                                        <tr
                                            key={siswa.id_siswa}
                                            className="transition-colors"
                                            style={{
                                                borderBottom: '1px solid #fde0c8',
                                                background: index % 2 === 0 ? '#fff' : '#fffaf6'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                        >
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-bold text-gray-800">{siswa.nama}</p>
                                                    {jenisPenilaian === 'PAS' && siswa.pts_sakit !== undefined && (
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            PTS: S:{siswa.pts_sakit} I:{siswa.pts_izin} A:{siswa.pts_alpha}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600 font-mono text-xs">
                                                {siswa.nis}
                                            </td>

                                            {/* Sakit */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="90"
                                                        value={editedValues?.sakit ?? 0}
                                                        onChange={(e) => handleInputChange(siswa.id_siswa, 'sakit', e.target.value)}
                                                        className={inputCls}
                                                        disabled={isSaving}
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 font-semibold">{siswa.sakit || 0}</span>
                                                )}
                                            </td>

                                            {/* Izin */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="90"
                                                        value={editedValues?.izin ?? 0}
                                                        onChange={(e) => handleInputChange(siswa.id_siswa, 'izin', e.target.value)}
                                                        className={inputCls}
                                                        disabled={isSaving}
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 font-semibold">{siswa.izin || 0}</span>
                                                )}
                                            </td>

                                            {/* Alpha */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="90"
                                                        value={editedValues?.alpha ?? 0}
                                                        onChange={(e) => handleInputChange(siswa.id_siswa, 'alpha', e.target.value)}
                                                        className={inputCls}
                                                        disabled={isSaving}
                                                    />
                                                ) : (
                                                    <span className="text-gray-700 font-semibold">{siswa.alpha || 0}</span>
                                                )}
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => openConfirmModal(siswa.id_siswa)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                            style={{
                                                                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                                                                color: '#fff',
                                                                boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                                                            }}
                                                        >
                                                            {isSaving ? (
                                                                <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                            ) : (
                                                                <Check size={13} />
                                                            )}
                                                            Simpan
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelEdit(siswa.id_siswa)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                            style={{
                                                                background: '#f5f5f5',
                                                                color: '#666',
                                                                border: '1px solid #ddd'
                                                            }}
                                                        >
                                                            <X size={13} /> Batal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEdit(siswa.id_siswa)}
                                                        disabled={isReadOnly}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{
                                                            background: isReadOnly ? '#e5e7eb' : '#fff0e5',
                                                            border: isReadOnly ? '1px solid #d1d5db' : '1px solid #f5a623',
                                                            color: isReadOnly ? '#6b7280' : '#b35a08'
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!isReadOnly) {
                                                                e.currentTarget.style.background = '#ffe4c8';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (!isReadOnly) {
                                                                e.currentTarget.style.background = '#fff0e5';
                                                            }
                                                        }}
                                                    >
                                                        {isReadOnly ? (
                                                            <>
                                                                <Lock size={13} /> Terkunci
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Edit3 size={13} /> Edit
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info */}
                <div className="px-5 py-4 flex items-start gap-2" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#c95b08' }} />
                    <div className="text-xs" style={{ color: '#c95b08' }}>
                        <p className="font-semibold mb-1">Petunjuk Pengisian:</p>
                        <ul className="space-y-0.5 list-disc list-inside">
                            <li>Klik tombol <strong>Edit</strong> pada baris siswa untuk menginput absensi</li>
                            <li>Isi jumlah hari sakit, izin, dan alpha (maksimal 90 hari)</li>
                            <li>Klik <strong>Simpan</strong> untuk menyimpan data</li>
                            {jenisPenilaian === 'PAS' && statusPAS === 'aktif' && (
                                <li className="font-semibold">Total absensi PAS harus ≥ data PTS yang sudah diinput</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && confirmData && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 ab-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 ab-scaleIn">
                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ab-pulse mx-auto mb-4">
                            <ShieldAlert size={32} className="text-orange-500" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                            Konfirmasi Penyimpanan
                        </h3>

                        <p className="text-sm text-gray-500 text-center mb-6">
                            Apakah Anda yakin ingin menyimpan data absensi ini?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeSave}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                                style={{
                                    background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                    boxShadow: '0 3px 10px rgba(232,105,10,0.3)'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🆕 BARU: Modal Import Absensi */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 ab-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget && !importing) setShowImportModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ab-scaleIn">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <Upload size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Import Absensi {jenisPenilaian}</h3>
                                    <p className="text-xs text-gray-500">
                                        Kelas {absensiData?.kelas} • Semester {semesterAktif}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (!importing) setShowImportModal(false); }}
                                disabled={importing}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Info Box */}
                        <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle size={16} className="text-blue-600" />
                                Langkah-langkah Import:
                            </p>
                            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                <li>Download template Excel (sudah berisi daftar siswa)</li>
                                <li>Isi data absensi (Sakit, Izin, Alpha)</li>
                                <li>Simpan file Excel</li>
                                <li>Upload file Excel yang sudah diisi</li>
                                <li>Klik "Import Absensi" untuk memproses</li>
                            </ol>
                        </div>

                        {/* Info Periode */}
                        <div className="mb-5 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                            <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-800">
                                <strong>Periode {jenisPenilaian}:</strong>{' '}
                                {jenisPenilaian === 'PTS'
                                    ? 'Input absensi untuk periode PTS saja.'
                                    : 'Input total absensi semester (harus ≥ data PTS yang sudah diinput).'}
                            </p>
                        </div>

                        {/* Tombol Download Template */}
                        <div className="mb-5">
                            <button
                                onClick={handleDownloadTemplate}
                                disabled={downloadingTemplate}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                    boxShadow: '0 3px 10px rgba(245,158,11,0.3)'
                                }}
                                onMouseEnter={e => {
                                    if (!downloadingTemplate) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#d97706,#b45309)';
                                }}
                                onMouseLeave={e => {
                                    if (!downloadingTemplate) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
                                }}
                            >
                                {downloadingTemplate ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Mengunduh Template...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        📥 Download Template Excel
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Upload Area */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>
                                Upload File Excel <span className="text-red-500">*</span>
                            </label>
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                                    }`}
                                onClick={() => importFileInputRef.current?.click()}
                            >
                                <input
                                    ref={importFileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleImportFileChange}
                                    className="hidden"
                                />
                                {importFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle2 size={24} className="text-green-600" />
                                        </div>
                                        <p className="text-sm font-bold text-green-900">{importFile.name}</p>
                                        <p className="text-xs text-green-700">
                                            {(importFile.size / 1024).toFixed(1)} KB - Klik untuk ganti file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload size={32} className="text-orange-400" />
                                        <p className="text-sm font-bold text-orange-900">Klik untuk pilih file Excel</p>
                                        <p className="text-xs text-orange-700">
                                            Format: .xlsx atau .xls (Maks 10MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                                disabled={importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeImport}
                                disabled={!importFile || importing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg,#10b981,#059669)',
                                    boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                                }}
                            >
                                {importing ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Mengimport...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Import Absensi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}