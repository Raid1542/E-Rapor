'use client';
import { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Eye, Pencil, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, LogOut, Award, Lock, Upload, Download } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/guru-kelas`;

// ====== HELPER: Parse Error dari Backend ======
const parseBackendError = async (res: Response): Promise<{ message: string; code?: string }> => {
    try {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            if (res.status === 404) return { message: 'Endpoint tidak ditemukan.', code: 'NOT_FOUND' };
            if (res.status === 500) return { message: 'Server error.', code: 'SERVER_ERROR' };
            return { message: `Server error (${res.status}).`, code: 'INVALID_RESPONSE' };
        }
        const data = await res.json();
        return { message: data.message || 'Terjadi kesalahan', code: data.code };
    } catch {
        return { message: 'Gagal memproses response dari server' };
    }
};

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

interface EkskulItem {
    id: number;
    nama: string;
    deskripsi: string;
}

interface SiswaEkskul {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    ekskul: EkskulItem[];
    jumlah_ekskul: number;
}

interface EkskulOption {
    id_ekskul: number;
    nama_ekskul: string;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes ap-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ap-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ap-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .ap-fadeIn  { animation: ap-fadeIn  0.2s ease; }
        .ap-scaleIn { animation: ap-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .ap-pulse   { animation: ap-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ====== NOTIF MODAL ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 ap-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ap-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
};

// ====== SHARED STYLE CONSTANTS ======
const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
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

// ====== MAIN COMPONENT ======
export default function EkskulClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [siswaList, setSiswaList] = useState<SiswaEkskul[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaEkskul[]>([]);
    const [daftarEkskul, setDaftarEkskul] = useState<EkskulOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // ✅ KONDISI 1: Belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ✅ KONDISI 2: Read-Only mode (PAS belum aktif / sudah selesai)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);

    // Modal state
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaEkskul | null>(null);
    const [editSiswa, setEditSiswa] = useState<SiswaEkskul | null>(null);
    const [editData, setEditData] = useState<{ ekskul_id: number; deskripsi: string }[]>([
        { ekskul_id: 0, deskripsi: '' },
        { ekskul_id: 0, deskripsi: '' },
        { ekskul_id: 0, deskripsi: '' }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    // ✅ STATE KONFIRMASI (sama seperti kokurikuler)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmSiswaNama, setConfirmSiswaNama] = useState<string>('');

    //  BARU: STATE untuk Import Ekstrakurikuler
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); setSelectedSiswa(null); }, 200);
    };

    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => { setShowEdit(false); setEditClosing(false); setEditSiswa(null); }, 200);
    };

    // ====== FETCH DATA ======
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    return;
                }

                const res = await fetch(`${API}/ekskul`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const siswa = data.data || [];
                        setSiswaList(siswa);
                        setFilteredSiswa(siswa);
                        setDaftarEkskul(data.daftar_ekskul || []);
                        setKelasNama(data.kelas || 'Kelas Anda');

                        const pasStatus = data.pasStatus;
                        if (pasStatus === 'selesai') {
                            setIsReadOnly(true);
                            setReadOnlyReason('locked');
                            setTimeout(() => {
                                showModal({
                                    type: 'warning',
                                    title: 'PAS Sudah Selesai',
                                    message: 'Data ekstrakurikuler sudah dikunci karena PAS telah selesai.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit.'
                                });
                            }, 500);
                        } else if (pasStatus === 'nonaktif') {
                            setIsReadOnly(true);
                            setReadOnlyReason('not_open');
                            setTimeout(() => {
                                showModal({
                                    type: 'warning',
                                    title: '⏳ PAS Belum Aktif',
                                    message: 'Input ekstrakurikuler hanya tersedia saat PAS aktif.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi belum dapat mengedit.\n\nSilakan hubungi admin untuk membuka periode PAS.'
                                });
                            }, 500);
                        }
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Terjadi kesalahan' });
                    }
                } else {
                    const errData = await parseBackendError(res);

                    if (errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                    } else if (errData.code === 'PERIOD_NOT_OPEN') {
                        setIsReadOnly(true);
                        setReadOnlyReason('not_open');
                        setSiswaList([]);
                        setFilteredSiswa([]);
                        setTimeout(() => {
                            showModal({
                                type: 'warning',
                                title: '⏳ PAS Belum Aktif',
                                message: errData.message || 'Input ekstrakurikuler hanya tersedia saat PAS aktif.\n\nSilakan hubungi admin untuk membuka periode PAS.'
                            });
                        }, 500);
                    } else if (errData.code === 'PERIOD_LOCKED') {
                        setIsReadOnly(true);
                        setReadOnlyReason('locked');
                        setSiswaList([]);
                        setFilteredSiswa([]);
                        setTimeout(() => {
                            showModal({
                                type: 'warning',
                                title: 'PAS Sudah Selesai',
                                message: errData.message || 'Input ekstrakurikuler sudah dikunci karena PAS telah selesai.'
                            });
                        }, 500);
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: errData.message || 'Terjadi kesalahan.' });
                    }
                }
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ====== FILTER PENCARIAN ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) ||
                s.nis.includes(q) ||
                s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const handleDetail = (siswa: SiswaEkskul) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    // ✅ PERBAIKAN: Cek read-only sebelum buka modal edit
    const handleEdit = (siswa: SiswaEkskul) => {
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'PAS sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit data ekstrakurikuler.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: '⏳ Mode Baca Saja',
                    message: 'PAS belum aktif.\n\nAnda belum dapat mengedit data ekstrakurikuler.\n\nSilakan tunggu admin membuka periode PAS.'
                });
            }
            return;
        }

        setEditSiswa(siswa);

        const initialData = [
            { ekskul_id: 0, deskripsi: '' },
            { ekskul_id: 0, deskripsi: '' },
            { ekskul_id: 0, deskripsi: '' }
        ];

        siswa.ekskul.forEach((ekskul, index) => {
            if (index < 3) {
                initialData[index] = {
                    ekskul_id: ekskul.id,
                    deskripsi: ekskul.deskripsi
                };
            }
        });

        setEditData(initialData);
        setShowEdit(true);
    };

    const handleEkskulChange = (index: number, field: 'ekskul_id' | 'deskripsi', value: any) => {
        const newData = [...editData];
        newData[index] = { ...newData[index], [field]: value };
        
        // Jika mengubah ID ekskul, reset deskripsi agar diisi ulang
        if (field === 'ekskul_id' && Number(value) > 0) {
            newData[index].deskripsi = '';
        }
        
        setEditData(newData);
    };

    // ✅ DIPERBAIKI: Validasi + buka modal konfirmasi + cek duplikasi ekskul
    const openConfirmSave = () => {
        if (!editSiswa) return;

        const validEkskul = editData.filter(e => e.ekskul_id > 0);

        if (validEkskul.length === 0 && editSiswa.ekskul.length === 0) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Tidak ada data yang diubah.'
            });
            return;
        }

        // ✅ Validasi duplikasi ekskul
        const ekskulIds = validEkskul.map(e => e.ekskul_id);
        if (new Set(ekskulIds).size !== ekskulIds.length) {
            showModal({
                type: 'warning',
                title: 'Ekskul Duplikat',
                message: 'Tidak boleh memilih ekstrakurikuler yang sama lebih dari 1 kali.\n\nSilakan pilih ekskul yang berbeda untuk setiap slot.'
            });
            return;
        }

        for (let i = 0; i < validEkskul.length; i++) {
            if (!validEkskul[i].deskripsi.trim()) {
                showModal({
                    type: 'warning',
                    title: 'Deskripsi Kosong',
                    message: `Deskripsi ekstrakurikuler ke-${i + 1} (${validEkskul[i].ekskul_id ? daftarEkskul.find(d => d.id_ekskul === validEkskul[i].ekskul_id)?.nama_ekskul : 'Pilihan'}) wajib diisi.`
                });
                return;
            }
        }

        setConfirmSiswaNama(editSiswa.nama);
        setShowConfirmModal(true);
    };

    // ✅ Actual save (dipanggil dari modal konfirmasi)
    const executeSave = async () => {
        if (!editSiswa) return;

        setIsSaving(true);
        const validEkskul = editData.filter(e => e.ekskul_id > 0);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
                return;
            }

            const res = await fetch(`${API}/ekskul/${editSiswa.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ekskulList: validEkskul })
            });

            if (res.ok) {
                const updatedSiswa = siswaList.map(s => {
                    if (s.id === editSiswa.id) {
                        return {
                            ...s,
                            ekskul: validEkskul.map(e => ({
                                id: e.ekskul_id,
                                nama: daftarEkskul.find(de => de.id_ekskul === e.ekskul_id)?.nama_ekskul || '',
                                deskripsi: e.deskripsi
                            })),
                            jumlah_ekskul: validEkskul.length
                        };
                    }
                    return s;
                });

                setSiswaList(updatedSiswa);
                setFilteredSiswa(updatedSiswa);

                setShowConfirmModal(false);
                closeEdit();
                setConfirmSiswaNama('');

                setTimeout(() => {
                    showModal({
                        type: 'success',
                        title: 'Berhasil!',
                        message: 'Data ekstrakurikuler berhasil disimpan.'
                    });
                }, 250);
            } else {
                const errData = await parseBackendError(res);
                setShowConfirmModal(false);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: errData.message });
            }
        } catch (err: any) {
            setShowConfirmModal(false);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 🆕 BARU: IMPORT EKSTRAKURIKULER HANDLERS
    // ═════════════════════════════════════════════════════════════════════════

    const openImportModal = () => {
        if (isReadOnly) {
            showModal({
                type: 'warning',
                title: 'Mode Baca Saja',
                message: readOnlyReason === 'locked'
                    ? 'PAS sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengimport data ekstrakurikuler.'
                    : 'PAS belum aktif.\n\nAnda tidak dapat mengimport data ekstrakurikuler.'
            });
            return;
        }

        setImportFile(null);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
        setShowImportModal(true);
    };

        // ✅ DIPERBAIKI: Tambahkan safe check dan error parsing yang lebih detail
    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/ekskul/import-template`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                // Coba baca error JSON dari backend, jika gagal baca pakai text biasa
                let errMsg = 'Gagal download template';
                try {
                    const errData = await response.json();
                    errMsg = errData.message || errMsg;
                } catch (e) {
                    errMsg = await response.text() || errMsg;
                }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // ✅ PERBAIKAN: Pastikan kelasNama adalah string dan ada fallback 'Kelas'
            const safeKelasNama = (kelasNama || 'Kelas').replace(/[^a-z0-9]/gi, '_');
            a.download = `Template_Ekskul_${safeKelasNama}.xlsx`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Tutup modal import DULU
            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            // Tampilkan notifikasi success SETELAH modal import tertutup
            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Template Berhasil Diunduh',
                    message: 'Template Excel berhasil diunduh ke folder Downloads.\n\nLangkah selanjutnya:\n1. Buka file Excel yang sudah diunduh\n2. Pilih ekskul dari dropdown (maks 3 per siswa)\n3. Isi deskripsi aktivitas\n4. Simpan file Excel\n5. Klik tombol "Import Ekskul" untuk upload file'
                });
            }, 300);
        } catch (err: any) {
            // ✅ PENTING: Lihat error detail di Console Browser (F12)
            console.error('[ERROR] Download Template:', err); 
            
            showModal({
                type: 'error',
                title: 'Gagal Mengunduh Template',
                message: err.message || 'Terjadi kesalahan saat mengunduh template. Pastikan Anda ditugaskan di kelas.'
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

    // ✅ DIPERBAIKI: Tambahkan kolom NIS di CSV error report dengan regex yang lebih robust
    const downloadErrorReportEkskul = (errors: any[]) => {
        const headers = ['No', 'Baris', 'NIS', 'Nama Siswa', 'Alasan Error'];

        const rows = errors.map((err, index) => {
            const message = err.message || '';
            const rowMatch = message.match(/Baris\s+(\d+)/i);
            const rowNumber = rowMatch ? rowMatch[1] : '-';

            // Regex yang lebih fleksibel untuk menangkap NIS
            const nisMatch = message.match(/NIS\s+"([^"]+)"/i) || message.match(/NIS\s+([0-9]+)/i);
            const nis = nisMatch ? nisMatch[1] : '-';

            const namaMatch = message.match(/siswa\s+"([^"]+)"/i) || message.match(/\(([^\)]+)\)/i);
            const namaSiswa = namaMatch ? namaMatch[1] : '-';

            const escapedMessage = message.replace(/"/g, '""');

            return [
                index + 1,
                rowNumber,
                nis,
                namaSiswa,
                `"${escapedMessage}"`
            ].join(',');
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `error_import_ekskul_${kelasNama.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ✅ DIPERBAIKI: Tampilkan info NIS duplikat
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

            const response = await fetch(`${API}/ekskul/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengimport ekstrakurikuler');
            }

            // Refresh data
            const refreshRes = await fetch(`${API}/ekskul`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                if (refreshData.success) {
                    setSiswaList(refreshData.data || []);
                    setFilteredSiswa(refreshData.data || []);
                    setDaftarEkskul(refreshData.daftar_ekskul || []);
                }
            }

            setShowImportModal(false);
            setImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';

            //  AUTO-DOWNLOAD CSV JIKA ERROR > 4
            const errors = data.data?.errors || [];
            const totalErrors = errors.length;

            if (totalErrors > 4) {
                downloadErrorReportEkskul(errors);
            }

            // Build success message
            let successMessage = data.message;

            if (totalErrors > 0) {
                if (totalErrors <= 4) {
                    successMessage += `\n\n📋 Detail Error:\n${errors.slice(0, 4).map((e: any) => `• ${e.message}`).join('\n')}`;
                } else {
                    successMessage += `\n\n📋 Contoh Error (3 dari ${totalErrors}):\n${errors.slice(0, 3).map((e: any) => `• ${e.message}`).join('\n')}`;
                    successMessage += `\n\n📥 File CSV error telah diunduh otomatis!\n   (error_import_ekskul_*.csv)`;
                }
            }

            // ✅ Tampilkan info NIS duplikat
            if (data.data?.nis_duplikat_count && data.data.nis_duplikat_count > 0) {
                const duplikatInfo = data.data.nis_duplikat_detail
                    .map((d: any) => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`)
                    .join(', ');
                successMessage += `\n\n⚠️ DITEMUKAN ${data.data.nis_duplikat_count} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses.`;
            }

            // ✅ Tampilkan pesan penting
            if (data.data?.pesan_penting) {
                successMessage += `\n\n💡 ${data.data.pesan_penting}`;
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
                message: err.message || 'Terjadi kesalahan saat mengimport ekstrakurikuler.'
            });
        } finally {
            setImporting(false);
        }
    };

    // ====== PAGINATION LOGIC ======
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

    // ====== RENDER UTAMA ======

    // ✅ KONDISI 1: Belum Ditugaskan → Blokir Total
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ap-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ap-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ap-pulse">
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

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />

            {/* Modals */}
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Ekstrakurikuler Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data ekstrakurikuler siswa kelas {kelasNama} (maks. 3 per siswa)</p>
            </div>

            {/* ✅ BANNER READ-ONLY (KONDISI 2) */}
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
                                ? 'PAS telah selesai dan data sudah dikunci. Anda dapat melihat data siswa, tetapi tidak dapat mengedit ekstrakurikuler.'
                                : 'PAS belum aktif. Anda dapat melihat data siswa, tetapi belum dapat mengedit ekstrakurikuler. Silakan hubungi admin untuk membuka periode PAS.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                            Kelas: <span style={{ color: '#e8690a' }}>{kelasNama}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* 🆕 BARU: Tombol Import Ekskul */}
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
                                    Import Ekskul
                                </button>
                            )}

                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
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
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* Tabel & Empty State */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'NIS', 'NISN', 'Ekstrakurikuler', 'Aksi'].map(h => (
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
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
                                                <Users size={32} style={{ color: '#e8690a' }} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-base">
                                                    {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                                    {searchQuery
                                                        ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                                                        : `Belum ada siswa yang terdaftar di kelas Anda.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentSiswa.map((siswa, index) => (
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
                                        {siswa.ekskul.length === 0 ? (
                                            <span className="text-xs text-gray-400 italic">Belum diisi</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {siswa.ekskul.map((ekskul, i) => (
                                                    <span key={i} title={ekskul.deskripsi}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-help"
                                                        style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                        <Award size={10} />
                                                        {ekskul.nama}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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
                                            <button
                                                onClick={() => handleEdit(siswa)}
                                                disabled={isReadOnly}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                    background: isReadOnly ? '#e5e7eb' : 'linear-gradient(135deg,#e8690a,#f5a623)',
                                                    color: isReadOnly ? '#6b7280' : '#fff',
                                                    boxShadow: isReadOnly ? 'none' : '0 2px 8px rgba(232,105,10,0.3)'
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isReadOnly) {
                                                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isReadOnly) {
                                                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)';
                                                    }
                                                }}
                                            >
                                                {isReadOnly ? (
                                                    <>
                                                        <Lock size={13} /> Terkunci
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pencil size={13} /> Edit
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredSiswa.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                        <div className="flex items-center gap-1">{renderPagination()}</div>
                    </div>
                )}
            </div>

            {/* ====== MODAL DETAIL SISWA ====== */}
            {showDetail && selectedSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Ekstrakurikuler</h2>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{selectedSiswa.nama}</h3>
                                <p className="text-sm text-gray-500">NIS: {selectedSiswa.nis} | NISN: {selectedSiswa.nisn}</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Ekstrakurikuler yang Diikuti:</h4>
                                {selectedSiswa.ekskul.length === 0 ? (
                                    <div className="text-center py-8 rounded-xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                        <Award size={32} className="mx-auto mb-2" style={{ color: '#e8690a' }} />
                                        <p className="text-sm text-gray-500">Belum mengikuti ekstrakurikuler</p>
                                    </div>
                                ) : (
                                    selectedSiswa.ekskul.map((ekskul, i) => (
                                        <div key={i} className="rounded-xl p-4" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award size={16} style={{ color: '#e8690a' }} />
                                                <p className="text-sm font-bold text-gray-800">{ekskul.nama}</p>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">{ekskul.deskripsi}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL EDIT SISWA ====== */}
            {showEdit && editSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Edit Ekstrakurikuler</h2>
                            <button onClick={closeEdit}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <p className="text-sm font-bold text-gray-800">{editSiswa.nama}</p>
                                <p className="text-xs text-gray-500">NIS: {editSiswa.nis} | NISN: {editSiswa.nisn}</p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Pilih Ekstrakurikuler (Maksimal 3):</p>

                                {editData.map((item, index) => (
                                    <div key={index} className="rounded-xl p-4" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>
                                                {index + 1}
                                            </div>
                                            <p className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>Ekstrakurikuler {index + 1}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                    Pilih Ekstrakurikuler
                                                </label>
                                                <select
                                                    value={item.ekskul_id}
                                                    onChange={(e) => handleEkskulChange(index, 'ekskul_id', Number(e.target.value))}
                                                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-white border-orange-200"
                                                >
                                                    <option value={0}>-- Pilih Ekstrakurikuler --</option>
                                                    {daftarEkskul.map(ekskul => (
                                                        <option key={ekskul.id_ekskul} value={ekskul.id_ekskul}>
                                                            {ekskul.nama_ekskul}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                                    Deskripsi Aktivitas <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={item.deskripsi}
                                                    onChange={(e) => handleEkskulChange(index, 'deskripsi', e.target.value)}
                                                    placeholder="Tuliskan deskripsi aktivitas siswa di ekstrakurikuler ini..."
                                                    rows={3}
                                                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-white border-orange-200 placeholder:text-gray-400 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeEdit}>Batal</BtnSecondary>
                                <button
                                    onClick={openConfirmSave}
                                    disabled={isSaving}
                                    className={btnPrimary.base}
                                    style={{ ...btnPrimary.style, opacity: isSaving ? 0.6 : 1 }}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* MODAL KONFIRMASI - TEMPLATE SAMA SEPERTI KOKURIKULER */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 ap-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget && !isSaving) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ap-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi Penyimpanan
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            Apakah Anda yakin ingin menyimpan data {confirmSiswaNama}?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                {isSaving ? (
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

            {/* 🆕 BARU: MODAL IMPORT EKSTRAKURIKULER */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 ap-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget && !importing) setShowImportModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ap-scaleIn">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <Upload size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Import Ekstrakurikuler</h3>
                                    <p className="text-xs text-gray-500">
                                        Kelas {kelasNama}
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
                                <li>Pilih ekskul dari dropdown (maks 3 per siswa)</li>
                                <li>Isi deskripsi aktivitas</li>
                                <li>Simpan file Excel</li>
                                <li>Upload file Excel yang sudah diisi</li>
                                <li>Klik "Import Ekskul" untuk memproses</li>
                            </ol>
                        </div>

                        {/* ✅ DIPERBAIKI: Info Periode lebih lengkap */}
                        <div className="mb-5 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                            <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-orange-800 space-y-1">
                                <p><strong>Info Import:</strong></p>
                                <p>• Setiap siswa dapat mengikuti maksimal 3 ekstrakurikuler</p>
                                <p>• Setiap ekskul wajib memiliki deskripsi aktivitas</p>
                                <p>• NIS harus unik (tidak boleh duplikat)</p>
                                <p className="mt-1 text-orange-700">
                                    💡 <strong>Tip:</strong> Input hanya tersedia saat PAS aktif. Data dikunci jika PAS selesai.
                                </p>
                            </div>
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
                                        Import Ekskul
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