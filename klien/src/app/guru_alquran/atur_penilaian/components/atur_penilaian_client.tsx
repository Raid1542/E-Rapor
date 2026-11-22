'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Lock, FileText, SlidersHorizontal, GraduationCap, Users, AlertCircle, Info, Save } from 'lucide-react';
import { MAPEL_ALQURAN, mockDataKelompok } from '@/lib/mockKelompok';
import { MOCK_PERIOD, mockKomponenPenilaian, mockKategoriDefault, getBobot, saveBobot, getKategori, saveKategori, computeCoverage, KategoriAkademik, BobotItem } from '@/lib/mockAturPenilaian';

import BatchEditModal from './batch_edit_modal';
import ConfirmModal from './confirm_modal';

/* ===== DESIGN TOKENS ===== */
const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';
const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };
const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const COLORS = { success: { bg: '#dcfce7', text: '#166534', border: '#86efac' }, warning: { bg: '#fef9c3', text: '#92400e', border: '#fde68a' }, info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, neutral: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' } };
const GRID_COLS_KATEGORI = 'minmax(56px,0.6fr) minmax(160px,1.4fr) minmax(220px,2.6fr)';

/* ===== GLOBAL STYLES ===== */
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .anim-in { animation: fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.03s; } .d2 { animation-delay: 0.07s; } .d3 { animation-delay: 0.11s; }
        .card-flat { transition: box-shadow 0.2s ease; } .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease; } .btn-action:hover { filter: brightness(1.04); }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2.5px solid #f5a623; outline-offset: 2px; }
    `}</style>
);

const ActionButton = ({ onClick, children, variant = 'neutral', disabled = false, fullWidth = false }: { onClick?: () => void; children: React.ReactNode; variant?: 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'danger'; disabled?: boolean; fullWidth?: boolean; }) => {
    const styles: Record<string, React.CSSProperties> = {
        primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
        info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
        warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308' },
        neutral: { background: '#fff', color: '#4b5563', border: '1.5px solid #e5e7eb' },
        success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
        danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
    };
    return <button onClick={onClick} disabled={disabled} className={`btn-action inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={styles[variant]}>{children}</button>;
};

const CoverageWarning = ({ coverage }: { coverage: { covered: boolean; gaps: { aspek: string; gap: string }[] } | null }) => {
    if (!coverage || coverage.covered || coverage.gaps.length === 0) return null;
    return (
        <div className="mb-5 pl-4 pr-4 py-4 rounded-xl flex items-start gap-3 anim-in" style={{ background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fde68a' }}><AlertCircle size={18} style={{ color: COLORS.warning.text }} /></div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-2" style={{ color: COLORS.warning.text }}>Range Nilai 0–100 Belum Lengkap</p>
                <div className="text-xs" style={{ color: COLORS.warning.text }}>
                    <p className="mb-2">Ditemukan {coverage.gaps.length} gap:</p>
                    <ul className="space-y-1 ml-4">{coverage.gaps.map((g, i) => (<li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.warning.text }}></span><span><strong>{g.aspek}:</strong> gap pada <strong className="px-1.5 py-0.5 rounded bg-amber-200/60">{g.gap}</strong></span></li>))}</ul>
                </div>
            </div>
        </div>
    );
};

/* ===== MAIN COMPONENT ===== */
export default function AturPenilaianClient() {
    const [jenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(MOCK_PERIOD.jenis);
    const [statusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>(MOCK_PERIOD.status_pts);
    const [statusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>(MOCK_PERIOD.status_pas);
    
    const isPeriodNotOpen = statusPTS === 'nonaktif' && statusPAS === 'nonaktif';
    const isPeriodLocked = (jenisPenilaianAktif === 'PTS' && statusPTS === 'selesai') || (jenisPenilaianAktif === 'PAS' && statusPAS === 'selesai');
    const isReadOnly = isPeriodNotOpen || isPeriodLocked;

    const [activeTab, setActiveTab] = useState<'akademik' | 'bobot'>('akademik');
    const [loading, setLoading] = useState(true);

    const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);
    const [selectedKelompokAkademik, setSelectedKelompokAkademik] = useState<string | null>(null);
    const [kategoriList, setKategoriList] = useState<KategoriAkademik[]>([]);
    const [kategoriLoading, setKategoriLoading] = useState(false);
    const coverageInfo = useMemo(() => kategoriList.length ? computeCoverage(kategoriList) : null, [kategoriList]);

    const [showBatchEdit, setShowBatchEdit] = useState(false);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    const [selectedMapelBobot, setSelectedMapelBobot] = useState<number | null>(null);
    const [selectedKelompokBobot, setSelectedKelompokBobot] = useState<string | null>(null);
    const [bobotList, setBobotList] = useState<BobotItem[]>([]);
    const [bobotLoading, setBobotLoading] = useState(false);
    const initialBobotListRef = useRef<BobotItem[]>([]);
    const [isSavingBobot, setIsSavingBobot] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'save-bobot' | 'save-batch-kategori' | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

    useEffect(() => {
        if (selectedMapelAkademik === null || selectedKelompokAkademik === null) { setKategoriList([]); return; }
        setKategoriLoading(true);
        const t = setTimeout(() => { setKategoriList(getKategori(selectedMapelAkademik, selectedKelompokAkademik)); setKategoriLoading(false); }, 300);
        return () => clearTimeout(t);
    }, [selectedMapelAkademik, selectedKelompokAkademik]);

    useEffect(() => {
        if (selectedMapelBobot === null || selectedKelompokBobot === null) { setBobotList([]); initialBobotListRef.current = []; return; }
        setBobotLoading(true);
        const t = setTimeout(() => { const b = getBobot(selectedMapelBobot, selectedKelompokBobot); setBobotList(b); initialBobotListRef.current = JSON.parse(JSON.stringify(b)); setBobotLoading(false); }, 300);
        return () => clearTimeout(t);
    }, [selectedMapelBobot, selectedKelompokBobot]);

    const handleTabChange = (tab: 'akademik' | 'bobot') => { setActiveTab(tab); };

    const openBatchEdit = () => {
        if (isReadOnly) return;
        setShowBatchEdit(true);
    };

    const handleSaveBatch = (cleanedData: KategoriAkademik[]) => {
        setIsSavingBatch(true);
        setTimeout(() => {
            saveKategori(selectedMapelAkademik!, selectedKelompokAkademik!, cleanedData);
            setKategoriList(cleanedData);
            setIsSavingBatch(false);
            setShowBatchEdit(false);
        }, 500);
    };

    const isPTSActive = jenisPenilaianAktif === 'PTS';
    const handleBobotChange = (komponenId: number, value: string) => {
        let num = parseFloat(value); if (isNaN(num)) num = 0; if (num < 0) num = 0; if (num > 100) num = 100; num = Math.round(num * 100) / 100;
        setBobotList(prev => prev.map(b => b.komponen_id === komponenId ? { ...b, bobot: num } : b));
    };
    
    const totalBobot = bobotList.reduce((s, b) => {
        const komp = mockKomponenPenilaian.find(k => k.id_komponen === b.komponen_id);
        const isPTS = komp && /^PTS$/i.test(komp.nama_komponen);
        return s + (isPTSActive ? (isPTS ? 100 : 0) : b.bobot);
    }, 0);
    const isBobotValid = Math.abs(totalBobot - 100) < 0.01;

    const openConfirmSaveBobot = () => {
        if (selectedMapelBobot === null || selectedKelompokBobot === null) return;
        const unchanged = bobotList.every(b => { const ini = initialBobotListRef.current.find(i => i.komponen_id === b.komponen_id); return ini && Math.abs(b.bobot - ini.bobot) < 0.01; });
        if (unchanged) { alert('Tidak ada data yang diubah.'); return; }
        if (Math.abs(totalBobot - 100) > 0.01) { alert(`Total bobot harus tepat 100%. Saat ini: ${totalBobot.toFixed(2)}%`); return; }
        if (isPTSActive) { alert('Bobot tidak dapat diubah saat periode PTS aktif.'); return; }
        
        setConfirmMessage(`Apakah Anda yakin ingin menyimpan bobot ini?`);
        setConfirmAction('save-bobot');
        setShowConfirmModal(true);
    };

    const executeSaveBobot = () => {
        setIsSavingBobot(true);
        setTimeout(() => {
            saveBobot(selectedMapelBobot!, selectedKelompokBobot!, bobotList);
            initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
            setIsSavingBobot(false);
            setShowConfirmModal(false);
        }, 500);
    };

    if (loading) return <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}><GlobalStyles /><div className="text-center anim-in"><div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 mx-auto mb-4 animate-spin" /><p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data...</p></div></div>;

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Atur Penilaian</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola kategori akademik dan bobot penilaian per mata pelajaran & kelompok</p>
            </div>

            {isReadOnly && (
                <div className="card-flat mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white anim-in d2" style={{ ...CARD_STYLE, borderLeft: `4px solid ${isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text}` }}>
                    <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text }} />
                    <div className="flex-1">
                        <p className="text-sm font-bold mb-1" style={{ color: isPeriodLocked ? COLORS.neutral.text : COLORS.warning.text }}>{isPeriodLocked ? 'Periode Penilaian Selesai' : 'Periode Penilaian Belum Aktif'}</p>
                        <p className="text-xs text-gray-500">{isPeriodLocked ? 'Konfigurasi kategori dan bobot sudah dikunci.' : 'Silakan hubungi admin.'}</p>
                    </div>
                </div>
            )}

            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                    <div className="inline-flex p-1 rounded-xl gap-1" style={{ background: '#f6f7f9', border: '1px solid #ececec' }}>
                        <button onClick={() => handleTabChange('akademik')} className="btn-action px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2" style={activeTab === 'akademik' ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 2px 8px rgba(232,105,10,0.25)' } : { background: 'transparent', color: ACCENT_DARK }}><FileText size={15} /> Kategori Akademik</button>
                        <button onClick={() => handleTabChange('bobot')} className="btn-action px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2" style={activeTab === 'bobot' ? { background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 2px 8px rgba(232,105,10,0.25)' } : { background: 'transparent', color: ACCENT_DARK }}><SlidersHorizontal size={15} /> Bobot Penilaian</button>
                    </div>
                </div>

                <div className="p-4 sm:p-6" key={activeTab}>
                    {/* TAB AKADEMIK */}
                    {activeTab === 'akademik' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <div>
                                    <label className={labelCls} style={labelColor}><span className="inline-flex items-center gap-1.5"><GraduationCap size={14} style={{ color: ACCENT }} /> Mata Pelajaran</span></label>
                                    <select value={selectedMapelAkademik ?? ''} onChange={(e) => { setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null); setSelectedKelompokAkademik(null); }} className={inputCls}>
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {MAPEL_ALQURAN.map(m => <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>)}
                                    </select>
                                </div>
                                {selectedMapelAkademik !== null && (
                                    <div>
                                        <label className={labelCls} style={labelColor}><span className="inline-flex items-center gap-1.5"><Users size={14} style={{ color: ACCENT }} /> Kelompok</span></label>
                                        <select value={selectedKelompokAkademik ?? ''} onChange={(e) => setSelectedKelompokAkademik(e.target.value || null)} className={inputCls}>
                                            <option value="">-- Pilih Kelompok --</option>
                                            {mockDataKelompok.map(k => <option key={k.id_kelompok} value={k.id_kelompok}>{k.nama_kelompok}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {selectedMapelAkademik !== null && selectedKelompokAkademik !== null ? (
                                <>
                                    <CoverageWarning coverage={coverageInfo} />
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                                        <div className="flex items-center gap-2"><FileText size={14} className="text-gray-400" /><p className="text-xs text-gray-500">Menampilkan <strong>{kategoriList.length}</strong> kategori</p></div>
                                        <ActionButton variant={isReadOnly ? 'neutral' : 'warning'} disabled={isReadOnly} onClick={openBatchEdit}>{isReadOnly ? (<><Lock size={16} /> Terkunci</>) : (<><span>Edit Semua</span></>)}</ActionButton>
                                    </div>
                                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ececec' }}>
                                        <div className="overflow-x-auto"><div style={{ width: '100%', minWidth: '480px' }}>
                                            <div className="grid" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, background: BRAND_GRADIENT }}>
                                                <div className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide flex items-center justify-center">No.</div>
                                                <div className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide flex items-center justify-center">Range Nilai</div>
                                                <div className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide flex items-center">Deskripsi</div>
                                            </div>
                                            {kategoriLoading ? (
                                                <div className="py-12 text-center text-gray-400 text-sm">Memuat kategori...</div>
                                            ) : kategoriList.length === 0 ? (
                                                <div className="py-12 text-center text-gray-400 text-sm">Belum ada kategori — klik "Edit Semua" untuk membuat.</div>
                                            ) : (
                                                kategoriList.slice().sort((a, b) => b.max_nilai - a.max_nilai).map((k, index) => (
                                                    <div key={k.id} className="grid border-b transition-colors hover:bg-orange-50/30" style={{ gridTemplateColumns: GRID_COLS_KATEGORI, borderColor: '#f0f0f0', background: '#fff' }}>
                                                        <div className="px-4 py-3.5 flex items-center justify-center text-gray-400">{index + 1}</div>
                                                        <div className="px-4 py-3.5 flex items-center justify-center"><span className="inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: '#fff5eb', color: ACCENT_DARK, border: `1px solid #fde0c8` }}>{Math.floor(k.min_nilai)} – {Math.floor(k.max_nilai)}</span></div>
                                                        <div className="px-4 py-3.5 flex items-center text-gray-700 truncate" title={k.deskripsi}>{k.deskripsi}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div></div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">{selectedMapelAkademik === null ? 'Pilih Mata Pelajaran' : 'Pilih Kelompok'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB BOBOT */}
                    {activeTab === 'bobot' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <div>
                                    <label className={labelCls} style={labelColor}><span className="inline-flex items-center gap-1.5"><GraduationCap size={14} style={{ color: ACCENT }} /> Mata Pelajaran</span></label>
                                    <select value={selectedMapelBobot ?? ''} onChange={(e) => { setSelectedMapelBobot(e.target.value ? Number(e.target.value) : null); setSelectedKelompokBobot(null); }} className={inputCls}>
                                        <option value="">-- Pilih Mata Pelajaran --</option>
                                        {MAPEL_ALQURAN.map(m => <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>)}
                                    </select>
                                </div>
                                {selectedMapelBobot !== null && (
                                    <div>
                                        <label className={labelCls} style={labelColor}><span className="inline-flex items-center gap-1.5"><Users size={14} style={{ color: ACCENT }} /> Kelompok</span></label>
                                        <select value={selectedKelompokBobot ?? ''} onChange={(e) => setSelectedKelompokBobot(e.target.value || null)} className={inputCls}>
                                            <option value="">-- Pilih Kelompok --</option>
                                            {mockDataKelompok.map(k => <option key={k.id_kelompok} value={k.id_kelompok}>{k.nama_kelompok}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {selectedMapelBobot !== null && selectedKelompokBobot !== null ? (
                                bobotLoading ? (
                                    <div className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin" /><p className="text-sm text-gray-400">Memuat bobot...</p></div></div>
                                ) : (
                                    <div>
                                        {isPTSActive && (
                                            <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                                                <Info size={18} style={{ color: COLORS.info.text, flexShrink: 0 }} /><p className="text-sm" style={{ color: COLORS.info.text }}>Periode <strong>PTS</strong> aktif — bobot otomatis <strong>PTS = 100%</strong></p>
                                            </div>
                                        )}
                                        <div className="space-y-3 mb-6">
                                            {bobotList.map((bobot) => {
                                                const komp = mockKomponenPenilaian.find(k => k.id_komponen === bobot.komponen_id);
                                                const isPTS = komp && /^PTS$/i.test(komp.nama_komponen);
                                                const display = isPTSActive ? (isPTS ? 100 : 0) : bobot.bobot;
                                                const editable = !isPTSActive && !isReadOnly;
                                                return (
                                                    <div key={bobot.komponen_id} className="flex items-center justify-between gap-4 p-4 rounded-xl transition-colors" style={{ background: editable ? '#fafafa' : '#f3f4f6', border: `1px solid ${editable ? '#ececec' : '#e5e7eb'}` }}>
                                                        <div className="flex-1"><span className="font-bold text-sm text-gray-700">{komp?.nama_komponen || 'Komponen'}</span></div>
                                                        <div className="flex items-center gap-2">
                                                            <input type="text" inputMode="decimal" pattern="[0-9]*" value={display} onChange={(e) => { if (editable) { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) handleBobotChange(bobot.komponen_id, v); } }} onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) { if (v < 0) handleBobotChange(bobot.komponen_id, '0'); else if (v > 100) handleBobotChange(bobot.komponen_id, '100'); } }} disabled={!editable} maxLength={5} className={`w-24 h-11 px-3 text-center font-bold rounded-xl border-2 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 ${editable ? 'bg-white text-gray-800 border-gray-200' : 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'}`} readOnly={!editable} placeholder="0" />
                                                            <span className="text-base font-bold text-gray-600">%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="p-4 rounded-xl mb-6" style={{ background: isBobotValid ? COLORS.success.bg : COLORS.warning.bg, border: `1px solid ${isBobotValid ? COLORS.success.border : COLORS.warning.border}` }}>
                                            <div className="flex justify-between items-center"><span className="font-bold text-sm text-gray-700">Total Bobot:</span><span className="text-lg font-bold" style={{ color: isBobotValid ? COLORS.success.text : COLORS.warning.text }}>{totalBobot.toFixed(2)}%</span></div>
                                        </div>
                                        {!isPTSActive && !isReadOnly && (
                                            <div className="flex justify-end pt-4 border-t" style={{ borderColor: '#f0f0f0' }}>
                                                <ActionButton variant="primary" disabled={isSavingBobot || !isBobotValid} onClick={openConfirmSaveBobot}>{isSavingBobot ? 'Menyimpan...' : <><Save size={16} /> Simpan Bobot</>}</ActionButton>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center rounded-2xl" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                                    <SlidersHorizontal size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">{selectedMapelBobot === null ? 'Pilih Mata Pelajaran' : 'Pilih Kelompok'}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== MODALS (SUDAH DIPISAH KE FILE TERSENDIRI) ===== */}
            <BatchEditModal 
                isOpen={showBatchEdit} 
                onClose={() => setShowBatchEdit(false)} 
                initialData={kategoriList.length > 0 ? kategoriList : mockKategoriDefault}
                onSave={handleSaveBatch}
                isSaving={isSavingBatch}
            />
            
            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmAction === 'save-bobot' ? executeSaveBobot : () => {}}
                title="Konfirmasi Penyimpanan"
                message={confirmMessage}
                isSaving={isSavingBobot || isSavingBatch}
            />
        </div>
    );
}