'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface AspekKokurikuler   { id_aspek_kokurikuler: number; nama: string; }
interface KategoriAkademik   { id: number; min_nilai: number; max_nilai: number; deskripsi: string; urutan: number; }
interface KategoriKokurikuler{ id: number; min_nilai: number; max_nilai: number; grade: string; deskripsi: string; urutan: number; id_aspek_kokurikuler: number; }
interface KomponenPenilaian  { id_komponen: number; nama_komponen: string; urutan: number; }
interface BobotItem          { komponen_id: number; bobot: number; is_active: boolean; }
interface MapelItem          { mata_pelajaran_id: number; nama_mapel: string; jenis: 'wajib' | 'pilihan'; bisa_input: boolean; }

const API = 'http://localhost:5000/api/guru-kelas';

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes ds-fadeIn  { from { opacity:0 } to { opacity:1 } }
    @keyframes ds-scaleIn { from { opacity:0; transform:scale(0.93) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
    @keyframes ds-pulse   { 0%,100% { transform:scale(1) } 50% { transform:scale(1.1) } }
    .ds-fadeIn  { animation: ds-fadeIn  0.2s ease }
    .ds-scaleIn { animation: ds-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) }
    .ds-pulse   { animation: ds-pulse   0.6s ease 0.15s }
  `}</style>
);

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────
const MODAL_STYLES: Record<ModalType, { iconBg:string; ring:string; icon:React.ReactNode; btn:string }> = {
  success: { iconBg:'bg-green-50',  ring:'ring-green-100',  icon:<CheckCircle2 size={40} className="text-green-500"/>,  btn:'bg-green-500 hover:bg-green-600' },
  error:   { iconBg:'bg-red-50',    ring:'ring-red-100',    icon:<AlertCircle  size={40} className="text-red-500"/>,    btn:'bg-red-500 hover:bg-red-600' },
  warning: { iconBg:'bg-orange-50', ring:'ring-orange-100', icon:<ShieldAlert  size={40} className="text-orange-500"/>, btn:'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg:'bg-slate-100', ring:'ring-slate-200',  icon:<WifiOff      size={40} className="text-slate-500"/>,  btn:'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18}/></button>
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

const ConfirmModal = ({ message, onConfirm, onCancel }: { message:string; onConfirm:()=>void; onCancel:()=>void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ds-pulse">
        <ShieldAlert size={40} className="text-orange-500"/>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border font-semibold text-sm" style={{ borderColor:'#fde0c8', color:'#7a3a0a' }}>Batal</button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm" style={{ background:'linear-gradient(135deg,#e8690a,#f5a623)' }}>Ya, Lanjutkan</button>
      </div>
    </div>
  </div>
);

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const CARD_STYLE  = { border:'1px solid #f97316', boxShadow:'0 2px 16px rgba(200,80,10,0.15)' };
const HEADER_GRAD = { background:'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background:'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };
const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const labelCls    = "block text-sm font-semibold mb-1.5";
const labelColor  = { color:'#7a3a0a' };

const BtnSecondary = ({ onClick, children }: { onClick:()=>void; children:React.ReactNode }) => (
  <button onClick={onClick} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor:'#fde0c8', color:'#7a3a0a', background:'#fff' }}
    onMouseEnter={e=>(e.currentTarget.style.background='#fff0e5')}
    onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>{children}</button>
);
const BtnPrimary = ({ onClick, children, disabled }: { onClick:()=>void; children:React.ReactNode; disabled?:boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${disabled?'opacity-40 cursor-not-allowed':''}`}
    style={{ background:'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow:disabled?'none':'0 3px 12px rgba(232,105,10,0.3)' }}
    onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background='linear-gradient(135deg,#c95b08,#e8690a)' }}
    onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.background='linear-gradient(135deg,#e8690a,#f5a623)' }}>{children}</button>
);

// ─── HELPER: authenticated fetch dengan error handling token ─────────────────
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  if (!token) throw Object.assign(new Error('Sesi Anda telah berakhir. Silakan login kembali.'), { code: 'NO_TOKEN' });

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  // Token expired / invalid
  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('token');
      throw Object.assign(new Error('Sesi Anda telah berakhir. Silakan login kembali.'), { code: 'TOKEN_EXPIRED' });
    }
    throw Object.assign(new Error(data.message || 'Akses ditolak'), { code: 'FORBIDDEN' });
  }

  return res;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AturPenilaianPage() {
  const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
  const [activeTab, setActiveTab] = useState<'kokurikuler' | 'akademik' | 'bobot'>('kokurikuler');

  // Loading state terpisah
  const [pageLoading, setPageLoading]       = useState(true);
  const [kategoriLoading, setKategoriLoading] = useState(false);
  const [bobotLoading, setBobotLoading]     = useState(false);
  const [savingKategori, setSavingKategori] = useState(false);
  const [savingBobot, setSavingBobot]       = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);

  // Data
  const [aspekList,    setAspekList]    = useState<AspekKokurikuler[]>([]);
  const [mapelList,    setMapelList]    = useState<MapelItem[]>([]);
  const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);

  // Kategori
  const [kategoriList, setKategoriList] = useState<(KategoriAkademik | KategoriKokurikuler)[]>([]);

  // Modal edit/tambah kategori
  const [showEditKategori,    setShowEditKategori]    = useState(false);
  const [editKategoriId,      setEditKategoriId]      = useState<number | null>(null);
  const [editKategoriClosing, setEditKategoriClosing] = useState(false);
  const [editKategoriData, setEditKategoriData] = useState<{
    min_nilai: number; max_nilai: number; grade?: string; deskripsi: string; id_aspek_kokurikuler?: number;
  }>({ min_nilai: 0, max_nilai: 100, deskripsi: '' });
  const initialEditKategoriDataRef = useRef<typeof editKategoriData | null>(null);

  // Mapel selection (akademik)
  const [selectedMapelAkademik,     setSelectedMapelAkademik]     = useState<number | null>(null);
  const [selectedMapelForRataRata,  setSelectedMapelForRataRata]  = useState(false);

  // Bobot
  const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
  const [bobotList,        setBobotList]        = useState<BobotItem[]>([]);
  const initialBobotListRef = useRef<BobotItem[]>([]);

  // Modals
  const [modal,      setModal]      = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message:string; onConfirm:()=>void } | null>(null);

  // AbortController untuk cancel fetch lama (fix race condition)
  const abortRef = useRef<AbortController | null>(null);

  const showModal   = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal  = useCallback(() => setModal(null), []);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  // ── Token expired handler ──────────────────────────────────────────────────
  const handleAuthError = useCallback((err: any) => {
    if (err.code === 'NO_TOKEN' || err.code === 'TOKEN_EXPIRED') {
      showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Sesi Anda telah berakhir. Silakan login kembali.' });
      // Redirect ke login setelah 2 detik
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return true;
    }
    return false;
  }, [showModal]);

  // ── Fetch data awal (komponen, mapel, aspek, tahun ajaran) ─────────────────
  useEffect(() => {
    const fetchInitial = async () => {
      setPageLoading(true);
      setPageError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setPageError('Token tidak ditemukan. Silakan login kembali.');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Ambil semua data pendukung secara paralel
        const [taRes, komponenRes, mapelRes, aspekRes] = await Promise.all([
          fetch(`${API}/tahun-ajaran/aktif`,                       { headers }),
          fetch(`${API}/atur-penilaian/komponen`,                  { headers }),
          fetch(`${API}/mapel`,                                    { headers }),
          fetch(`${API}/atur-penilaian/aspek-kokurikuler`,         { headers }),
        ]);

        // Cek masing-masing response dengan pesan spesifik
        if (!taRes.ok) {
          const err = await taRes.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal mengambil data tahun ajaran aktif. Pastikan admin sudah mengatur tahun ajaran.');
        }
        if (!komponenRes.ok) {
          const err = await komponenRes.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal mengambil komponen penilaian. Hubungi admin untuk mengkonfigurasi komponen.');
        }
        if (!mapelRes.ok) {
          const err = await mapelRes.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal mengambil daftar mata pelajaran.');
        }
        if (!aspekRes.ok) {
          const err = await aspekRes.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal mengambil aspek kokurikuler. Hubungi admin untuk mengkonfigurasi aspek.');
        }

        const [taData, komponenData, mapelData, aspekData] = await Promise.all([
          taRes.json(), komponenRes.json(), mapelRes.json(), aspekRes.json(),
        ]);

        const { status_pts, status_pas } = taData.data || {};
        setJenisPenilaianAktif(status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null);
        setKomponenList(komponenData.data || []);
        setMapelList([...(mapelData.wajib || []), ...(mapelData.pilihan || [])]);
        setAspekList(aspekData.data || []);
      } catch (err: any) {
        // Cek jika error jaringan (TypeError: Failed to fetch)
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setPageError('Tidak dapat terhubung ke server. Pastikan backend berjalan di localhost:5000.');
        } else {
          setPageError(err.message || 'Gagal memuat data pendukung');
        }
      } finally {
        setPageLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // ── Fetch kategori (dengan AbortController untuk fix race condition) ────────
  useEffect(() => {
    if (activeTab === 'bobot') return;
    if (pageLoading) return;

    // Cancel request sebelumnya
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const fetchKategori = async () => {
      setKategoriLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        let endpoint = '';
        if (activeTab === 'akademik') {
          if (selectedMapelForRataRata)             endpoint = 'atur-penilaian/kategori-rata-rata';
          else if (selectedMapelAkademik !== null)   endpoint = `atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}`;
          else { setKategoriList([]); setKategoriLoading(false); return; }
        } else {
          endpoint = 'atur-penilaian/kategori-kokurikuler';
        }

        const res = await fetch(`${API}/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (signal.aborted) return; // Request sudah di-cancel, abaikan

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Gagal mengambil kategori`);
        }

        const data = await res.json();
        setKategoriList(data.data || []);
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Normal, abaikan
        if (err instanceof TypeError && err.message.includes('fetch')) {
          showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } else {
          showModal({ type: 'network', title: 'Gagal Memuat', message: err.message || 'Terjadi kesalahan saat memuat kategori.' });
        }
      } finally {
        if (!signal.aborted) setKategoriLoading(false);
      }
    };
    fetchKategori();

    return () => { abortRef.current?.abort(); };
  }, [activeTab, selectedMapelAkademik, selectedMapelForRataRata, pageLoading]);

  // ── Reset state mapel saat ganti tab ──────────────────────────────────────
  const handleTabChange = (tab: 'kokurikuler' | 'akademik' | 'bobot') => {
    if (tab !== 'akademik') {
      // Jangan reset saat kembali ke akademik, tapi reset saat pergi dari akademik
      setSelectedMapelAkademik(null);
      setSelectedMapelForRataRata(false);
    }
    setKategoriList([]);
    setActiveTab(tab);
  };

  // ── Fetch bobot ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedMapelId === null || activeTab !== 'bobot') {
      setBobotList([]);
      initialBobotListRef.current = [];
      return;
    }
    const fetchBobot = async () => {
      setBobotLoading(true);
      try {
        const res = await authFetch(`${API}/atur-penilaian/bobot-akademik/${selectedMapelId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal mengambil bobot penilaian');
        }
        const data = await res.json();
        const bobotData: any[] = data.data || [];
        const bobotMap = new Map<number, number>();
        bobotData.forEach((b: any) => {
          const num = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
          bobotMap.set(b.komponen_id, isNaN(num) ? 0 : num);
        });
        const fullBobot = komponenList.map(k => ({
          komponen_id: k.id_komponen,
          bobot:       bobotMap.get(k.id_komponen) || 0,
          is_active:   true,
        }));
        setBobotList(fullBobot);
        initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
      } catch (err: any) {
        if (handleAuthError(err)) return;
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal mengambil bobot penilaian.' });
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
        min_nilai: kategori.min_nilai,
        max_nilai: kategori.max_nilai,
        grade:     'grade' in kategori ? kategori.grade : undefined,
        deskripsi: kategori.deskripsi,
        id_aspek_kokurikuler: 'id_aspek_kokurikuler' in kategori ? kategori.id_aspek_kokurikuler : undefined,
      };
      setEditKategoriData(d);
      initialEditKategoriDataRef.current = d;
    } else {
      setEditKategoriId(null);
      setEditKategoriData({
        min_nilai: 0, max_nilai: 100, deskripsi: '',
        grade: activeTab === 'kokurikuler' ? '' : undefined,
        id_aspek_kokurikuler: undefined,
      });
      initialEditKategoriDataRef.current = null;
    }
    setShowEditKategori(true);
  };

  const closeEditKategori = () => {
    setEditKategoriClosing(true);
    setTimeout(() => { setShowEditKategori(false); setEditKategoriClosing(false); setEditKategoriId(null); }, 200);
  };

  // ── Validasi form kategori (frontend) ──────────────────────────────────────
  const validateKategoriForm = (): string | null => {
    const { min_nilai, max_nilai, deskripsi, grade, id_aspek_kokurikuler } = editKategoriData;

    if (activeTab === 'kokurikuler') {
      if (!id_aspek_kokurikuler) return 'Pilih aspek kokurikuler terlebih dahulu.';
      if (!grade?.trim())         return 'Grade tidak boleh kosong. Contoh: A, B+, C.';
    }
    if (!deskripsi.trim())  return 'Deskripsi tidak boleh kosong.';
    if (min_nilai < 0 || max_nilai > 100) return 'Nilai harus berada dalam rentang 0–100.';
    if (min_nilai >= max_nilai)  return 'Nilai minimum harus lebih kecil dari nilai maksimum.';

    return null; // Valid
  };

  // ── Simpan kategori ────────────────────────────────────────────────────────
  const handleSaveKategori = async () => {
    // Cek tidak ada perubahan
    const initial = initialEditKategoriDataRef.current;
    if (initial &&
      editKategoriData.min_nilai === initial.min_nilai &&
      editKategoriData.max_nilai === initial.max_nilai &&
      editKategoriData.deskripsi === initial.deskripsi &&
      editKategoriData.grade === initial.grade &&
      editKategoriData.id_aspek_kokurikuler === initial.id_aspek_kokurikuler
    ) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return;
    }

    // Validasi frontend
    const validationError = validateKategoriForm();
    if (validationError) {
      showModal({ type: 'warning', title: 'Data Tidak Valid', message: validationError });
      return;
    }

    setSavingKategori(true);
    try {
      const isAkademik = activeTab === 'akademik';
      let endpoint = '';
      let payload: any;

      if (isAkademik) {
        if (selectedMapelForRataRata) {
          endpoint = 'atur-penilaian/kategori-rata-rata';
          payload  = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, deskripsi: editKategoriData.deskripsi, urutan: 0 };
        } else {
          if (selectedMapelAkademik === null) {
            showModal({ type: 'warning', title: 'Pilih Mata Pelajaran', message: 'Pilih mata pelajaran terlebih dahulu.' });
            return;
          }
          endpoint = 'atur-penilaian/kategori-akademik';
          payload  = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, deskripsi: editKategoriData.deskripsi, urutan: 0, mapel_id: selectedMapelAkademik };
        }
      } else {
        endpoint = 'atur-penilaian/kategori-kokurikuler';
        payload  = { min_nilai: editKategoriData.min_nilai, max_nilai: editKategoriData.max_nilai, grade: editKategoriData.grade?.trim().toUpperCase(), deskripsi: editKategoriData.deskripsi, urutan: 0, id_aspek_kokurikuler: editKategoriData.id_aspek_kokurikuler };
      }

      const url    = editKategoriId ? `${API}/${endpoint}/${editKategoriId}` : `${API}/${endpoint}`;
      const method = editKategoriId ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();

      if (!res.ok) {
        // Mapping kode error backend ke pesan ramah pengguna
        if (data.code === 'RANGE_OVERLAP') {
          showModal({ type: 'warning', title: 'Rentang Nilai Bertabrakan', message: data.message || 'Rentang nilai yang Anda masukkan bertabrakan dengan kategori yang sudah ada.\nSesuaikan nilai min/max agar tidak tumpang tindih.' });
        } else if (data.code === 'RANGE_ERROR') {
          showModal({ type: 'warning', title: 'Rentang Tidak Valid', message: data.message });
        } else if (data.code === 'VALIDATION_ERROR') {
          showModal({ type: 'warning', title: 'Data Tidak Lengkap', message: data.message });
        } else {
          showModal({ type: 'error', title: 'Gagal Menyimpan', message: data.message || 'Terjadi kesalahan saat menyimpan kategori.' });
        }
        return;
      }

      // Reload daftar kategori
      let reloadUrl = `${API}/${endpoint}`;
      if (isAkademik && !selectedMapelForRataRata && selectedMapelAkademik) reloadUrl += `?mapel_id=${selectedMapelAkademik}`;
      const token   = localStorage.getItem('token');
      const resRel  = await fetch(reloadUrl, { headers: { Authorization: `Bearer ${token}` } });
      const relData = await resRel.json();
      setKategoriList(relData.data || []);

      closeEditKategori();
      showModal({
        type: 'success',
        title: editKategoriId ? 'Kategori Diperbarui!' : 'Kategori Ditambahkan!',
        message: editKategoriId ? 'Kategori berhasil diperbarui.' : 'Kategori baru berhasil ditambahkan.',
      });
    } catch (err: any) {
      if (handleAuthError(err)) return;
      if (err instanceof TypeError && err.message.includes('fetch')) {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
      } else {
        showModal({ type: 'error', title: 'Terjadi Kesalahan', message: err.message || 'Gagal menyimpan kategori.' });
      }
    } finally {
      setSavingKategori(false);
    }
  };

  // ── Hapus kategori ─────────────────────────────────────────────────────────
  const handleDeleteKategori = (id: number) => {
    showConfirm('Hapus kategori ini? Tindakan tidak dapat dibatalkan.', async () => {
      try {
        const endpoint = activeTab === 'akademik'
          ? (selectedMapelForRataRata ? 'atur-penilaian/kategori-rata-rata' : 'atur-penilaian/kategori-akademik')
          : 'atur-penilaian/kategori-kokurikuler';

        const res  = await authFetch(`${API}/${endpoint}/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
          if (data.code === 'NOT_FOUND') {
            showModal({ type: 'warning', title: 'Tidak Ditemukan', message: 'Kategori sudah dihapus atau tidak ditemukan.' });
            setKategoriList(prev => prev.filter(k => k.id !== id));
          } else {
            showModal({ type: 'error', title: 'Gagal Menghapus', message: data.message || 'Terjadi kesalahan saat menghapus kategori.' });
          }
          return;
        }

        setKategoriList(prev => prev.filter(k => k.id !== id));
        showModal({ type: 'success', title: 'Kategori Dihapus!', message: 'Kategori berhasil dihapus.' });
      } catch (err: any) {
        if (handleAuthError(err)) return;
        if (err instanceof TypeError && err.message.includes('fetch')) {
          showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } else {
          showModal({ type: 'error', title: 'Terjadi Kesalahan', message: err.message });
        }
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

    // Cek tidak ada perubahan
    const isUnchanged = bobotList.every((b, i) => {
      const ini = initialBobotListRef.current[i];
      return ini && b.komponen_id === ini.komponen_id && b.bobot === ini.bobot;
    });
    if (isUnchanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data bobot yang diubah.' });
      return;
    }

    // Validasi tidak ada bobot negatif
    if (bobotList.some(b => b.bobot < 0)) {
      showModal({ type: 'warning', title: 'Bobot Tidak Valid', message: 'Bobot tidak boleh bernilai negatif.' });
      return;
    }

    // Validasi total = 100
    const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
    if (Math.abs(total - 100) > 0.1) {
      showModal({ type: 'warning', title: 'Total Bobot Salah', message: `Total bobot saat ini ${total.toFixed(1)}%.\nHarus tepat 100%.` });
      return;
    }

    setSavingBobot(true);
    try {
      const res  = await authFetch(`${API}/atur-penilaian/bobot-akademik/${selectedMapelId}`, {
        method: 'PUT',
        body:   JSON.stringify(bobotList),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'PERIOD_LOCKED') {
          showModal({ type: 'warning', title: 'Periode Terkunci', message: data.message });
        } else if (data.code === 'BOBOT_NOT_100') {
          showModal({ type: 'warning', title: 'Total Bobot Salah', message: data.message });
        } else {
          showModal({ type: 'error', title: 'Gagal Menyimpan', message: data.message || 'Gagal menyimpan bobot penilaian.' });
        }
        return;
      }

      initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
      showModal({ type: 'success', title: 'Bobot Disimpan!', message: 'Bobot penilaian berhasil disimpan.\nNilai rapor seluruh siswa telah dihitung ulang.' });
    } catch (err: any) {
      if (handleAuthError(err)) return;
      if (err instanceof TypeError && err.message.includes('fetch')) {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
      } else {
        showModal({ type: 'error', title: 'Terjadi Kesalahan', message: err.message });
      }
    } finally {
      setSavingBobot(false);
    }
  };

  // ── Loading / Error page ───────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor:'#fde0c8', borderTopColor:'#e8690a' }}/>
          <p className="text-sm font-semibold" style={{ color:'#c95b08' }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl max-w-md w-full text-center" style={CARD_STYLE}>
          <AlertCircle size={48} className="text-red-500"/>
          <div>
            <p className="text-base font-bold text-red-600 mb-2">Gagal Memuat Halaman</p>
            <p className="text-sm text-gray-500 leading-relaxed">{pageError}</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background:'linear-gradient(135deg,#e8690a,#f5a623)' }}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers render ─────────────────────────────────────────────────────────
  const tabs: { key:'kokurikuler'|'akademik'|'bobot'; label:string }[] = [
    { key:'kokurikuler', label:'Kategori Kokurikuler' },
    { key:'akademik',    label:'Kategori Akademik' },
    { key:'bobot',       label:'Atur Bobot Penilaian' },
  ];

  const emptyState = (msg: string) => (
    <div className="text-center py-12 rounded-2xl" style={{ background:'#fffaf6', border:'2px dashed #fde0c8' }}>
      <p className="text-base font-semibold" style={{ color:'#c95b08' }}>Pilih Mata Pelajaran</p>
      <p className="text-sm text-gray-400 mt-1">{msg}</p>
    </div>
  );

  const LoadingRow = ({ cols }: { cols: number }) => (
    <tr><td colSpan={cols} className="py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin"/>
        <span className="text-sm text-gray-400">Memuat...</span>
      </div>
    </td></tr>
  );

  const mapelWajibList = mapelList.filter(m => m.jenis === 'wajib');

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-screen p-6 bg-white">
      <GlobalStyles/>
      {modal     && <NotifModal modal={modal} onClose={closeModal}/>}
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
        <p className="text-sm mt-0.5" style={{ color:'#c95b08' }}>Kelola kategori dan bobot penilaian kelas Anda</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl overflow-hidden mb-5" style={CARD_STYLE}>
        <div className="flex" style={{ borderBottom:'1px solid #fde0c8' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className="relative px-5 py-3.5 text-sm font-semibold transition-colors"
              style={{
                color:       activeTab === tab.key ? '#e8690a' : '#888',
                borderBottom: activeTab === tab.key ? '2px solid #e8690a' : '2px solid transparent',
                background:  activeTab === tab.key ? '#fffaf6' : 'transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── TAB: KOKURIKULER ─────────────────────────────────────────── */}
          {activeTab === 'kokurikuler' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-base font-bold text-gray-800">Kategori Nilai Kokurikuler</p>
                  <p className="text-xs mt-0.5" style={{ color:'#c95b08' }}>Atur grade dan rentang nilai kokurikuler per aspek</p>
                </div>
                <BtnPrimary onClick={() => openEditKategori()}>
                  <Plus size={15}/> Tambah Kategori
                </BtnPrimary>
              </div>
              <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid #fde0c8' }}>
                <table className="w-full min-w-[600px] text-sm border-collapse">
                  <thead>
                    <tr style={TH_GRAD}>
                      {['Aspek','Grade','Range Nilai','Deskripsi','Aksi'].map(h => (
                        <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kategoriLoading ? <LoadingRow cols={5}/> :
                     kategoriList.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">Belum ada kategori kokurikuler. Klik "Tambah Kategori" untuk mulai.</td></tr>
                     ) : kategoriList.map((k, idx) => (
                      <tr key={k.id} className="transition-colors"
                        style={{ borderBottom:'1px solid #fde0c8', background: idx%2===0?'#fff':'#fffaf6' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='#fff0e5')}
                        onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?'#fff':'#fffaf6')}>
                        <td className="px-5 py-3.5 text-center text-gray-700">
                          {aspekList.find(a => a.id_aspek_kokurikuler === (k as KategoriKokurikuler).id_aspek_kokurikuler)?.nama || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background:'#fff0e5', color:'#c95b08', border:'1px solid #fde0c8' }}>
                            {(k as KategoriKokurikuler).grade}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-700">{k.min_nilai} – {k.max_nilai}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600 max-w-[200px] truncate" title={k.deskripsi}>{k.deskripsi}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEditKategori(k)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                              style={{ background:'#fff0e5', border:'1px solid #f5a623', color:'#b35a08' }}
                              onMouseEnter={e=>(e.currentTarget.style.background='#ffe4c8')}
                              onMouseLeave={e=>(e.currentTarget.style.background='#fff0e5')}>
                              <Pencil size={12}/> Edit
                            </button>
                            <button onClick={() => handleDeleteKategori(k.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                              style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#b91c1c' }}
                              onMouseEnter={e=>(e.currentTarget.style.background='#fee2e2')}
                              onMouseLeave={e=>(e.currentTarget.style.background='#fef2f2')}>
                              <Trash2 size={12}/> Hapus
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

          {/* ── TAB: AKADEMIK ────────────────────────────────────────────── */}
          {activeTab === 'akademik' && (
            <>
              <div className="mb-5">
                <p className="text-base font-bold text-gray-800 mb-1">Kategori Nilai Akademik</p>
                <p className="text-xs" style={{ color:'#c95b08' }}>Atur rentang nilai per mata pelajaran</p>
              </div>
              <div className="mb-5">
                <label className={labelCls} style={labelColor}>Pilih Mata Pelajaran</label>
                <select
                  value={selectedMapelAkademik || (selectedMapelForRataRata ? 'rata-rata' : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'rata-rata') { setSelectedMapelAkademik(null); setSelectedMapelForRataRata(true); }
                    else { setSelectedMapelAkademik(val ? Number(val) : null); setSelectedMapelForRataRata(false); }
                  }}
                  className="max-w-xs border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  <option value="rata-rata">📚 Rata-rata Seluruh Mapel</option>
                  {mapelWajibList.map(m => (
                    <option key={m.mata_pelajaran_id} value={m.mata_pelajaran_id}>{m.nama_mapel}</option>
                  ))}
                </select>
              </div>

              {(selectedMapelAkademik || selectedMapelForRataRata) ? (
                <>
                  <div className="flex justify-end mb-4">
                    <BtnPrimary onClick={() => openEditKategori()}>
                      <Plus size={15}/> Tambah Kategori
                    </BtnPrimary>
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid #fde0c8' }}>
                    <table className="w-full min-w-[500px] text-sm border-collapse">
                      <thead>
                        <tr style={TH_GRAD}>
                          {['Range Nilai','Deskripsi','Aksi'].map(h => (
                            <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {kategoriLoading ? <LoadingRow cols={3}/> :
                         kategoriList.length === 0 ? (
                          <tr><td colSpan={3} className="py-10 text-center text-sm text-gray-400">
                            {selectedMapelForRataRata ? 'Belum ada kategori untuk rata-rata nilai.' : 'Belum ada kategori untuk mata pelajaran ini.'}
                          </td></tr>
                         ) : kategoriList.map((k, idx) => (
                          <tr key={k.id} className="transition-colors"
                            style={{ borderBottom:'1px solid #fde0c8', background:idx%2===0?'#fff':'#fffaf6' }}
                            onMouseEnter={e=>(e.currentTarget.style.background='#fff0e5')}
                            onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?'#fff':'#fffaf6')}>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                style={{ background:'#fff0e5', color:'#c95b08', border:'1px solid #fde0c8' }}>
                                {k.min_nilai} – {k.max_nilai}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center text-gray-600 max-w-[250px] truncate" title={k.deskripsi}>{k.deskripsi}</td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openEditKategori(k)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                  style={{ background:'#fff0e5', border:'1px solid #f5a623', color:'#b35a08' }}
                                  onMouseEnter={e=>(e.currentTarget.style.background='#ffe4c8')}
                                  onMouseLeave={e=>(e.currentTarget.style.background='#fff0e5')}>
                                  <Pencil size={12}/> Edit
                                </button>
                                <button onClick={() => handleDeleteKategori(k.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                  style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#b91c1c' }}
                                  onMouseEnter={e=>(e.currentTarget.style.background='#fee2e2')}
                                  onMouseLeave={e=>(e.currentTarget.style.background='#fef2f2')}>
                                  <Trash2 size={12}/> Hapus
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

          {/* ── TAB: BOBOT ───────────────────────────────────────────────── */}
          {activeTab === 'bobot' && (
            <>
              <div className="mb-5">
                <p className="text-base font-bold text-gray-800 mb-1">Atur Bobot Penilaian</p>
                <p className="text-xs" style={{ color:'#c95b08' }}>Tentukan persentase bobot tiap komponen nilai</p>
              </div>
              <div className="mb-5">
                <label className={labelCls} style={labelColor}>Pilih Mata Pelajaran</label>
                <select
                  value={selectedMapelId || ''}
                  onChange={e => setSelectedMapelId(e.target.value ? Number(e.target.value) : null)}
                  className="max-w-xs border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {mapelWajibList.map(m => (
                    <option key={m.mata_pelajaran_id} value={m.mata_pelajaran_id}>{m.nama_mapel}</option>
                  ))}
                </select>
              </div>

              {selectedMapelId ? (
                bobotLoading ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin"/>
                    <span className="text-sm text-gray-400">Memuat bobot...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Banner PTS aktif */}
                    {isPTSActive && (
                      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background:'#fff0e5', border:'1px solid #fde0c8' }}>
                        <span className="text-lg mt-0.5">ℹ️</span>
                        <div>
                          <p className="text-sm font-bold" style={{ color:'#7a3a0a' }}>Periode PTS Aktif</p>
                          <p className="text-xs mt-1" style={{ color:'#c95b08' }}>
                            Sistem otomatis menetapkan <strong>PTS = 100%</strong>. Bobot tidak dapat diubah di periode ini.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Daftar bobot */}
                    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #fde0c8' }}>
                      {bobotList.map((bobot, idx) => {
                        const komponen   = komponenList.find(k => k.id_komponen === bobot.komponen_id);
                        const isPTS      = komponen && /^PTS$/i.test(komponen.nama_komponen);
                        const isEditable = !isPTSActive || isPTS;
                        // Saat PTS aktif, tampilkan nilai aktual (PTS=100, lainnya=0)
                        const displayVal = isPTSActive ? (isPTS ? 100 : 0) : bobot.bobot;

                        return (
                          <div key={bobot.komponen_id}
                            className="flex items-center justify-between px-5 py-3.5"
                            style={{ borderBottom: idx < bobotList.length-1 ? '1px solid #fde0c8':'none', background:idx%2===0?'#fff':'#fffaf6' }}>
                            <span className="text-sm font-semibold text-gray-700 min-w-[120px]">
                              {komponen?.nama_komponen || 'Komponen'}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min="0" max="100"
                                value={displayVal}
                                onChange={e => { if (isEditable && !isPTSActive) handleBobotChange(bobot.komponen_id, e.target.value); }}
                                disabled={!isEditable || isPTSActive}
                                className="w-24 rounded-xl px-3 py-2 text-sm text-center outline-none transition-all focus:ring-2 focus:ring-orange-400"
                                style={{
                                  border:     `1px solid ${isEditable && !isPTSActive ? '#f5a623':'#e5e7eb'}`,
                                  background: isEditable && !isPTSActive ? '#fff0e5':'#f9fafb',
                                  color:      isEditable && !isPTSActive ? '#7a3a0a':'#9ca3af',
                                  cursor:     isEditable && !isPTSActive ? 'text':'not-allowed',
                                }}
                              />
                              <span className="text-sm font-semibold w-4" style={{ color:'#c95b08' }}>%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total bobot */}
                    <div className="flex items-center justify-between px-5 py-3 rounded-xl"
                      style={{ background:'#fffaf6', border:'1px solid #fde0c8' }}>
                      <span className="text-sm font-bold text-gray-800">Total Bobot</span>
                      <span className="text-lg font-bold"
                        style={{ color: isPTSActive ? '#16a34a' : Math.abs(bobotList.reduce((s,b)=>s+b.bobot,0)-100)<0.1?'#16a34a':'#dc2626' }}>
                        {isPTSActive ? '100.00' : bobotList.reduce((s,b)=>s+b.bobot,0).toFixed(2)}%
                      </span>
                    </div>

                    {!isPTSActive && (
                      <div className="flex justify-end">
                        <BtnPrimary onClick={handleSaveBobot} disabled={savingBobot}>
                          {savingBobot ? 'Menyimpan...' : 'Simpan Bobot'}
                        </BtnPrimary>
                      </div>
                    )}
                  </div>
                )
              ) : emptyState('Pilih mata pelajaran untuk mengatur bobot komponen penilaiannya.')}
            </>
          )}

        </div>
      </div>

      {/* ── Modal Edit/Tambah Kategori ────────────────────────────────── */}
      {showEditKategori && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 transition-opacity duration-200 ${editKategoriClosing?'opacity-0':'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeEditKategori(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editKategoriClosing?'opacity-0 scale-95':'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">
                {editKategoriId ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button onClick={closeEditKategori}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white"/>
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
                      {aspekList.map(a => (
                        <option key={a.id_aspek_kokurikuler} value={a.id_aspek_kokurikuler}>{a.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={labelColor}>Grade <span className="text-red-500">*</span></label>
                    <input type="text"
                      value={editKategoriData.grade || ''}
                      onChange={e => setEditKategoriData({ ...editKategoriData, grade: e.target.value.toUpperCase() })}
                      className={inputCls} maxLength={3} placeholder="A, B+, C, dst."/>
                  </div>
                </>
              )}

              {/* Range nilai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={labelColor}>Nilai Min <span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="100"
                    value={editKategoriData.min_nilai}
                    onChange={e => setEditKategoriData({ ...editKategoriData, min_nilai: Number(e.target.value) })}
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls} style={labelColor}>Nilai Max <span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="100"
                    value={editKategoriData.max_nilai}
                    onChange={e => setEditKategoriData({ ...editKategoriData, max_nilai: Number(e.target.value) })}
                    className={inputCls}/>
                </div>
              </div>

              {/* Peringatan real-time min >= max */}
              {editKategoriData.min_nilai >= editKategoriData.max_nilai && (
                <p className="text-xs text-red-500 -mt-2">⚠ Nilai minimum harus lebih kecil dari nilai maksimum</p>
              )}

              {/* Deskripsi */}
              <div>
                <label className={labelCls} style={labelColor}>Deskripsi <span className="text-red-500">*</span></label>
                <textarea
                  value={editKategoriData.deskripsi}
                  onChange={e => setEditKategoriData({ ...editKategoriData, deskripsi: e.target.value })}
                  className={inputCls} rows={3}
                  placeholder="Contoh: Sangat Baik, Perlu Bimbingan, dll."/>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2" style={{ borderTop:'1px solid #fde0c8' }}>
                <BtnSecondary onClick={closeEditKategori}>Batal</BtnSecondary>
                <BtnPrimary onClick={handleSaveKategori} disabled={savingKategori}>
                  {savingKategori ? 'Menyimpan...' : 'Simpan'}
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}