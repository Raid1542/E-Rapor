'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface AspekKokurikuler {
    id_aspek_kokurikuler: number;
    nama: string;
}
interface KategoriAkademik {
    id: number;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    urutan: number;
}
interface KategoriKokurikuler {
    id: number;
    min_nilai: number;
    max_nilai: number;
    grade: string;
    deskripsi: string;
    urutan: number;
    id_aspek_kokurikuler: number;
}
interface KomponenPenilaian {
    id_komponen: number;
    nama_komponen: string;
    urutan: number;
}
interface BobotItem {
    komponen_id: number;
    bobot: number;
    is_active: boolean;
}
interface MapelItem {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
    bisa_input: boolean;
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
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
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

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ds-pulse">
                <ShieldAlert size={40} className="text-orange-500" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi</h3>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
            </div>
            <div className="flex gap-3 w-full">
                <button onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
                    style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>Batal</button>
                <button onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>Ya, Lanjutkan</button>
            </div>
        </div>
    </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG     = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
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

const BtnPrimary = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: disabled ? 'none' : '0 3px 12px rgba(232,105,10,0.3)' }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
    >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AturPenilaianPage() {
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [activeTab, setActiveTab] = useState<'kokurikuler' | 'akademik' | 'bobot'>('kokurikuler');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Kategori
    const [kategoriList, setKategoriList] = useState<(KategoriAkademik | KategoriKokurikuler)[]>([]);
    const [showEditKategori, setShowEditKategori] = useState(false);
    const [editKategoriId, setEditKategoriId] = useState<number | null>(null);
    const [editKategoriClosing, setEditKategoriClosing] = useState(false);
    const [editKategoriData, setEditKategoriData] = useState<{
        min_nilai: number;
        max_nilai: number;
        grade?: string;
        deskripsi: string;
        id_aspek_kokurikuler?: number;
    }>({ min_nilai: 0, max_nilai: 100, deskripsi: '' });
    const initialEditKategoriDataRef = useRef<typeof editKategoriData | null>(null);

    // Mapel selection
    const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [selectedMapelForRataRata, setSelectedMapelForRataRata] = useState(false);

    // Data
    const [aspekList, setAspekList] = useState<AspekKokurikuler[]>([]);
    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [bobotList, setBobotList] = useState<BobotItem[]>([]);
    const [bobotLoading, setBobotLoading] = useState(false);
    const initialBobotListRef = useRef<BobotItem[]>([]);

    // Modals
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const showModal   = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal  = useCallback(() => setModal(null), []);
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

    // ── Fetch data pendukung ───────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');

                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!taRes.ok) throw new Error('Gagal ambil tahun ajaran aktif');
                const taData = await taRes.json();
                const { status_pts, status_pas } = taData.data;
                setJenisPenilaianAktif(status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null);

                const [resKomponen, resMapel, resAspek] = await Promise.all([
                    fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/komponen',            { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('http://localhost:5000/api/guru-kelas/mapel',                             { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/aspek-kokurikuler',  { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                if (!resKomponen.ok || !resMapel.ok || !resAspek.ok) throw new Error('Gagal mengambil data pendukung');

                const [komponenData, mapelData, aspekData] = await Promise.all([
                    resKomponen.json(), resMapel.json(), resAspek.json(),
                ]);
                setKomponenList(komponenData.data || []);
                setMapelList([...(mapelData.wajib || []), ...(mapelData.pilihan || [])]);
                setAspekList(aspekData.data || []);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ── Fetch kategori ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab === 'bobot') return;
        const fetchKategori = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                let endpoint = '';
                if (activeTab === 'akademik') {
                    if (selectedMapelForRataRata)        endpoint = 'atur-penilaian/kategori-rata-rata';
                    else if (selectedMapelAkademik !== null) endpoint = `atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}`;
                    else { setKategoriList([]); setLoading(false); return; }
                } else {
                    endpoint = 'atur-penilaian/kategori-kokurikuler';
                }
                const res = await fetch(`http://localhost:5000/api/guru-kelas/${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`Gagal mengambil kategori ${activeTab}`);
                const data = await res.json();
                setKategoriList(data.data || []);
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        fetchKategori();
    }, [activeTab, selectedMapelAkademik, selectedMapelForRataRata]);

    // ── Fetch bobot ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (selectedMapelId === null || activeTab !== 'bobot') {
            setBobotList([]); initialBobotListRef.current = []; return;
        }
        const fetchBobot = async () => {
            setBobotLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`http://localhost:5000/api/guru-kelas/atur-penilaian/bobot-akademik/${selectedMapelId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let bobotData: any[] = [];
                if (res.ok) { const data = await res.json(); bobotData = data.data || []; }

                const bobotMap = new Map<number, number>();
                bobotData.forEach((b: any) => {
                    const num = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
                    bobotMap.set(b.komponen_id, isNaN(num) ? 0 : num);
                });
                const fullBobot = komponenList.map(k => ({ komponen_id: k.id_komponen, bobot: bobotMap.get(k.id_komponen) || 0, is_active: true }));
                setBobotList(fullBobot);
                initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
            } catch {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal mengambil bobot penilaian.' });
            } finally {
                setBobotLoading(false);
            }
        };
        fetchBobot();
    }, [selectedMapelId, komponenList, activeTab]);

    // ── Modal kategori ─────────────────────────────────────────────────────────
    const openEditKategori = (kategori: KategoriAkademik | KategoriKokurikuler | null = null) => {
        if (kategori) {
            setEditKategoriId(kategori.id);
            const d = {
                min_nilai: kategori.min_nilai, max_nilai: kategori.max_nilai,
                grade: 'grade' in kategori ? kategori.grade : undefined,
                deskripsi: kategori.deskripsi,
                id_aspek_kokurikuler: 'id_aspek_kokurikuler' in kategori ? kategori.id_aspek_kokurikuler : undefined,
            };
            setEditKategoriData(d);
            initialEditKategoriDataRef.current = d;
        } else {
            setEditKategoriId(null);
            setEditKategoriData({ min_nilai: 0, max_nilai: 100, deskripsi: '', grade: activeTab === 'kokurikuler' ? 'A' : undefined, id_aspek_kokurikuler: undefined });
            initialEditKategoriDataRef.current = null;
        }
        setShowEditKategori(true);
    };

    const closeEditKategori = () => {
        setEditKategoriClosing(true);
        setTimeout(() => { setShowEditKategori(false); setEditKategoriClosing(false); setEditKategoriId(null); }, 200);
    };

    // ── Simpan kategori ────────────────────────────────────────────────────────
    const handleSaveKategori = async () => {
        const initial = initialEditKategoriDataRef.current;
        if (initial &&
            editKategoriData.min_nilai === initial.min_nilai &&
            editKategoriData.max_nilai === initial.max_nilai &&
            editKategoriData.deskripsi === initial.deskripsi &&
            editKategoriData.grade === initial.grade &&
            editKategoriData.id_aspek_kokurikuler === initial.id_aspek_kokurikuler) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const isAkademik = activeTab === 'akademik';
            let endpoint = '';
            let payload: any;

            if (isAkademik) {
                if (selectedMapelForRataRata) {
                    endpoint = 'atur-penilaian/kategori-rata-rata';
                    payload = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, deskripsi: editKategoriData.deskripsi, urutan: 0 };
                } else {
                    if (selectedMapelAkademik === null) { showModal({ type: 'warning', title: 'Pilih Mata Pelajaran', message: 'Pilih mata pelajaran terlebih dahulu.' }); return; }
                    endpoint = 'atur-penilaian/kategori-akademik';
                    payload = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, deskripsi: editKategoriData.deskripsi, urutan: 0, mapel_id: selectedMapelAkademik };
                }
            } else {
                if (editKategoriData.id_aspek_kokurikuler == null) { showModal({ type: 'warning', title: 'Pilih Aspek', message: 'Pilih aspek kokurikuler terlebih dahulu.' }); return; }
                endpoint = 'atur-penilaian/kategori-kokurikuler';
                payload = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, grade: editKategoriData.grade, deskripsi: editKategoriData.deskripsi, urutan: 0, id_aspek_kokurikuler: editKategoriData.id_aspek_kokurikuler };
            }

            const url = editKategoriId
                ? `http://localhost:5000/api/guru-kelas/${endpoint}/${editKategoriId}`
                : `http://localhost:5000/api/guru-kelas/${endpoint}`;

            const res = await fetch(url, {
                method: editKategoriId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                closeEditKategori();
                let reloadUrl = `http://localhost:5000/api/guru-kelas/${endpoint}`;
                if (isAkademik && !selectedMapelForRataRata && selectedMapelAkademik) reloadUrl += `?mapel_id=${selectedMapelAkademik}`;
                const resReload = await fetch(reloadUrl, { headers: { Authorization: `Bearer ${token}` } });
                const data = await resReload.json();
                setKategoriList(data.data || []);
                showModal({ type: 'success', title: editKategoriId ? 'Kategori Diperbarui!' : 'Kategori Ditambahkan!', message: editKategoriId ? 'Kategori berhasil diperbarui.' : 'Kategori baru berhasil ditambahkan.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan saat menyimpan kategori.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ── Hapus kategori ─────────────────────────────────────────────────────────
    const handleDeleteKategori = (id: number) => {
        showConfirm('Hapus kategori ini? Tindakan tidak dapat dibatalkan.', async () => {
            try {
                const token = localStorage.getItem('token');
                let endpoint = activeTab === 'akademik'
                    ? (selectedMapelForRataRata ? 'atur-penilaian/kategori-rata-rata' : 'atur-penilaian/kategori-akademik')
                    : 'atur-penilaian/kategori-kokurikuler';

                const res = await fetch(`http://localhost:5000/api/guru-kelas/${endpoint}/${id}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setKategoriList(prev => prev.filter(k => k.id !== id));
                    showModal({ type: 'success', title: 'Kategori Dihapus!', message: 'Kategori berhasil dihapus.' });
                } else {
                    showModal({ type: 'error', title: 'Gagal Menghapus', message: 'Terjadi kesalahan saat menghapus kategori.' });
                }
            } catch {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            }
        });
    };

    // ── Bobot handlers ─────────────────────────────────────────────────────────
    const isPTSActive = jenisPenilaianAktif === 'PTS';

    const handleBobotChange = (komponenId: number, value: string) => {
        const newValue = parseFloat(value) || 0;
        setBobotList(prev => prev.map(b => b.komponen_id === komponenId ? { ...b, bobot: newValue } : b));
    };

    const handleSaveBobot = async () => {
        if (!selectedMapelId) return;
        const isUnchanged = bobotList.every((b, i) => {
            const ini = initialBobotListRef.current[i];
            return ini && b.komponen_id === ini.komponen_id && b.bobot === ini.bobot;
        });
        if (isUnchanged) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data bobot yang diubah.' }); return; }
        const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
        if (Math.abs(total - 100) > 0.1) { showModal({ type: 'warning', title: 'Total Bobot Salah', message: 'Total bobot harus berjumlah 100%.' }); return; }
        if (isPTSActive) {
            const ptsIds = komponenList.filter(k => /^PTS$/i.test(k.nama_komponen)).map(k => k.id_komponen);
            if (bobotList.some(b => !ptsIds.includes(b.komponen_id) && b.bobot > 0)) {
                showModal({ type: 'warning', title: 'Periode PTS Aktif', message: 'Di periode PTS, hanya bobot PTS yang boleh diisi.\nHarap atur bobot UH dan PAS menjadi 0.' }); return;
            }
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/guru-kelas/atur-penilaian/bobot-akademik/${selectedMapelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(bobotList),
            });
            if (res.ok) {
                initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
                showModal({ type: 'success', title: 'Bobot Disimpan!', message: 'Bobot penilaian berhasil disimpan.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan bobot penilaian.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ── Loading / Error states ─────────────────────────────────────────────────
    if (loading && kategoriList.length === 0 && !showEditKategori) {
        return (
            <div className="flex-1 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: '#fde0c8', borderTopColor: '#e8690a' }} />
                    <p className="text-sm font-semibold" style={{ color: '#c95b08' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl" style={CARD_STYLE}>
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-sm font-semibold text-red-600">Error: {error}</p>
                </div>
            </div>
        );
    }

    // ── Tab content helpers ────────────────────────────────────────────────────
    const tabs: { key: 'kokurikuler' | 'akademik' | 'bobot'; label: string }[] = [
        { key: 'kokurikuler', label: 'Kategori Kokurikuler' },
        { key: 'akademik',    label: 'Kategori Akademik' },
        { key: 'bobot',       label: 'Atur Bobot Penilaian' },
    ];

    const emptyState = (msg: string) => (
        <div className="text-center py-12 rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
            <p className="text-base font-semibold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran</p>
            <p className="text-sm text-gray-400 mt-1">{msg}</p>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {confirmCfg && (
                <ConfirmModal
                    message={confirmCfg.message}
                    onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
                    onCancel={() => setConfirmCfg(null)}
                />
            )}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola kategori dan bobot penilaian kelas Anda</p>
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-2xl overflow-hidden mb-5" style={CARD_STYLE}>
                <div className="flex" style={{ borderBottom: '1px solid #fde0c8' }}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className="relative px-5 py-3.5 text-sm font-semibold transition-colors"
                            style={{
                                color: activeTab === tab.key ? '#e8690a' : '#888',
                                borderBottom: activeTab === tab.key ? '2px solid #e8690a' : '2px solid transparent',
                                background: activeTab === tab.key ? '#fffaf6' : 'transparent',
                            }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-5">

                    {/* ── Tab: Kokurikuler ── */}
                    {activeTab === 'kokurikuler' && (
                        <>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <p className="text-base font-bold text-gray-800">Kategori Nilai Kokurikuler</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>Atur grade dan rentang nilai kokurikuler</p>
                                </div>
                                <BtnPrimary onClick={() => openEditKategori()}>
                                    <Plus size={15} /> Tambah Kategori
                                </BtnPrimary>
                            </div>
                            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #fde0c8' }}>
                                <table className="w-full min-w-[600px] text-sm border-collapse">
                                    <thead>
                                        <tr style={TH_GRAD}>
                                            {['Aspek', 'Grade', 'Range Nilai', 'Deskripsi', 'Aksi'].map(h => (
                                                <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-10 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                    <span className="text-sm text-gray-400">Memuat...</span>
                                                </div>
                                            </td></tr>
                                        ) : kategoriList.length === 0 ? (
                                            <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">Belum ada kategori kokurikuler</td></tr>
                                        ) : kategoriList.map((kategori, index) => (
                                            <tr key={kategori.id} className="transition-colors"
                                                style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                                <td className="px-5 py-3.5 text-center text-gray-700">
                                                    {aspekList.find(a => a.id_aspek_kokurikuler === (kategori as KategoriKokurikuler).id_aspek_kokurikuler)?.nama || '-'}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                                        style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                        {(kategori as KategoriKokurikuler).grade}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center text-gray-700">
                                                    {kategori.min_nilai} – {kategori.max_nilai}
                                                </td>
                                                <td className="px-5 py-3.5 text-center text-gray-600 max-w-[200px] truncate" title={kategori.deskripsi}>
                                                    {kategori.deskripsi}
                                                </td>
                                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => openEditKategori(kategori)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteKategori(kategori.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                            <Trash2 size={12} /> Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ── Tab: Akademik ── */}
                    {activeTab === 'akademik' && (
                        <>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <p className="text-base font-bold text-gray-800">Kategori Nilai Akademik</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>Atur rentang nilai per mata pelajaran</p>
                                </div>
                            </div>

                            {/* Dropdown mapel */}
                            <div className="mb-5">
                                <label className={labelCls} style={labelColor}>Pilih Mata Pelajaran</label>
                                <select
                                    value={selectedMapelAkademik || (selectedMapelForRataRata ? 'rata-rata' : '')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'rata-rata') { setSelectedMapelAkademik(null); setSelectedMapelForRataRata(true); }
                                        else { setSelectedMapelAkademik(val ? Number(val) : null); setSelectedMapelForRataRata(false); }
                                    }}
                                    className="max-w-xs border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    <option value="rata-rata">📚 Rata-rata Seluruh Mapel</option>
                                    {mapelList.filter(m => m.jenis === 'wajib').map(mapel => (
                                        <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedMapelAkademik || selectedMapelForRataRata ? (
                                <>
                                    <div className="flex justify-end mb-4">
                                        <BtnPrimary onClick={() => openEditKategori()}>
                                            <Plus size={15} /> Tambah Kategori
                                        </BtnPrimary>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #fde0c8' }}>
                                        <table className="w-full min-w-[500px] text-sm border-collapse">
                                            <thead>
                                                <tr style={TH_GRAD}>
                                                    {['Range Nilai', 'Deskripsi', 'Aksi'].map(h => (
                                                        <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan={3} className="py-10 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                            <span className="text-sm text-gray-400">Memuat...</span>
                                                        </div>
                                                    </td></tr>
                                                ) : kategoriList.length === 0 ? (
                                                    <tr><td colSpan={3} className="py-10 text-center text-sm text-gray-400">
                                                        {selectedMapelForRataRata ? 'Belum ada kategori untuk rata-rata nilai.' : 'Belum ada kategori untuk mata pelajaran ini.'}
                                                    </td></tr>
                                                ) : kategoriList.map((kategori, index) => (
                                                    <tr key={kategori.id} className="transition-colors"
                                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                                        <td className="px-5 py-3.5 text-center text-gray-700">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                                {kategori.min_nilai} – {kategori.max_nilai}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center text-gray-600 max-w-[250px] truncate" title={kategori.deskripsi}>
                                                            {kategori.deskripsi}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                            <div className="flex justify-center gap-2">
                                                                <button onClick={() => openEditKategori(kategori)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                    style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                                                    <Pencil size={12} /> Edit
                                                                </button>
                                                                <button onClick={() => handleDeleteKategori(kategori.id)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                                    <Trash2 size={12} /> Hapus
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : emptyState('Pilih mata pelajaran untuk melihat dan mengatur kategori nilainya.')}
                        </>
                    )}

                    {/* ── Tab: Bobot ── */}
                    {activeTab === 'bobot' && (
                        <>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <p className="text-base font-bold text-gray-800">Atur Bobot Penilaian</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>Tentukan persentase bobot tiap komponen nilai</p>
                                </div>
                            </div>

                            {/* Dropdown mapel */}
                            <div className="mb-5">
                                <label className={labelCls} style={labelColor}>Pilih Mata Pelajaran</label>
                                <select
                                    value={selectedMapelId || ''}
                                    onChange={e => setSelectedMapelId(e.target.value ? Number(e.target.value) : null)}
                                    className="max-w-xs border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelList.filter(m => m.jenis === 'wajib').map(mapel => (
                                        <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>{mapel.nama_mapel}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedMapelId ? (
                                bobotLoading ? (
                                    <div className="flex flex-col items-center gap-2 py-10">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        <span className="text-sm text-gray-400">Memuat bobot...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Banner PTS aktif */}
                                        {isPTSActive && (
                                            <div className="flex items-start gap-3 p-4 rounded-xl"
                                                style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                                <span className="text-lg mt-0.5">ℹ️</span>
                                                <div>
                                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Periode PTS Aktif</p>
                                                    <p className="text-xs mt-1" style={{ color: '#c95b08' }}>
                                                        Sistem otomatis menetapkan <strong>PTS = 100%</strong>. Anda tidak perlu mengatur bobot manual.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Daftar bobot */}
                                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #fde0c8' }}>
                                            {bobotList.map((bobot, index) => {
                                                const komponen  = komponenList.find(k => k.id_komponen === bobot.komponen_id);
                                                const isPTS     = komponen && /^PTS$/i.test(komponen.nama_komponen);
                                                const isEditable = !isPTSActive || isPTS;
                                                return (
                                                    <div key={bobot.komponen_id}
                                                        className="flex items-center justify-between px-5 py-3.5 transition-colors"
                                                        style={{ borderBottom: index < bobotList.length - 1 ? '1px solid #fde0c8' : 'none', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}>
                                                        <span className="text-sm font-semibold text-gray-700 min-w-[120px]">
                                                            {komponen?.nama_komponen || 'Komponen'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number" min="0" max="100"
                                                                value={isPTSActive && !isPTS ? 0 : bobot.bobot}
                                                                onChange={e => { if (isEditable) handleBobotChange(bobot.komponen_id, e.target.value); }}
                                                                disabled={!isEditable}
                                                                className="w-24 rounded-xl px-3 py-2 text-sm text-center outline-none transition-all focus:ring-2 focus:ring-orange-400"
                                                                style={{
                                                                    border: `1px solid ${isEditable ? '#f5a623' : '#e5e7eb'}`,
                                                                    background: isEditable ? '#fff0e5' : '#f9fafb',
                                                                    color: isEditable ? '#7a3a0a' : '#9ca3af',
                                                                    cursor: isEditable ? 'text' : 'not-allowed',
                                                                }}
                                                            />
                                                            <span className="text-sm font-semibold w-4" style={{ color: '#c95b08' }}>%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Total bobot */}
                                        <div className="flex items-center justify-between px-5 py-3 rounded-xl"
                                            style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                            <span className="text-sm font-bold text-gray-800">Total Bobot</span>
                                            <span className="text-lg font-bold"
                                                style={{ color: Math.abs(bobotList.reduce((s, b) => s + b.bobot, 0) - 100) < 0.1 ? '#16a34a' : '#dc2626' }}>
                                                {bobotList.reduce((s, b) => s + b.bobot, 0).toFixed(2)}%
                                            </span>
                                        </div>

                                        {!isPTSActive && (
                                            <div className="flex justify-end">
                                                <BtnPrimary onClick={handleSaveBobot}>Simpan Bobot</BtnPrimary>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : emptyState('Pilih mata pelajaran untuk mengatur bobot komponen penilaiannya.')}
                        </>
                    )}

                </div>
            </div>

            {/* ── Modal Edit/Tambah Kategori ──────────────────────────────── */}
            {showEditKategori && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 transition-opacity duration-200 ${editKategoriClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEditKategori(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editKategoriClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Modal header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">
                                {editKategoriId ? 'Edit Kategori' : 'Tambah Kategori'}
                            </h2>
                            <button onClick={closeEditKategori}
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Aspek & Grade (kokurikuler only) */}
                            {activeTab === 'kokurikuler' && (
                                <>
                                    <div>
                                        <label className={labelCls} style={labelColor}>Aspek Kokurikuler <span className="text-red-500">*</span></label>
                                        <select
                                            value={editKategoriData.id_aspek_kokurikuler || ''}
                                            onChange={e => setEditKategoriData({ ...editKategoriData, id_aspek_kokurikuler: Number(e.target.value) })}
                                            className={inputCls}>
                                            <option value="">-- Pilih Aspek --</option>
                                            {aspekList.map(aspek => (
                                                <option key={aspek.id_aspek_kokurikuler} value={aspek.id_aspek_kokurikuler}>{aspek.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls} style={labelColor}>Grade</label>
                                        <input type="text" value={editKategoriData.grade || ''}
                                            onChange={e => setEditKategoriData({ ...editKategoriData, grade: e.target.value.toUpperCase() })}
                                            className={inputCls} maxLength={2} placeholder="A, B+, dst." />
                                    </div>
                                </>
                            )}

                            {/* Range nilai */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls} style={labelColor}>Nilai Min</label>
                                    <input type="number" min="0" max="100" value={editKategoriData.min_nilai}
                                        onChange={e => setEditKategoriData({ ...editKategoriData, min_nilai: Number(e.target.value) })}
                                        className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls} style={labelColor}>Nilai Max</label>
                                    <input type="number" min="0" max="100" value={editKategoriData.max_nilai}
                                        onChange={e => setEditKategoriData({ ...editKategoriData, max_nilai: Number(e.target.value) })}
                                        className={inputCls} />
                                </div>
                            </div>

                            {/* Deskripsi */}
                            <div>
                                <label className={labelCls} style={labelColor}>Deskripsi</label>
                                <textarea value={editKategoriData.deskripsi}
                                    onChange={e => setEditKategoriData({ ...editKategoriData, deskripsi: e.target.value })}
                                    className={inputCls} rows={3} placeholder="Contoh: Sangat Baik, Perlu Bimbingan, dll." />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeEditKategori}>Batal</BtnSecondary>
                                <BtnPrimary onClick={handleSaveKategori}>Simpan</BtnPrimary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}