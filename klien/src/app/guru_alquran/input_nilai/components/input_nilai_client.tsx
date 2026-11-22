'use client';
import { useState, useEffect, useCallback } from 'react';
import { Lock, FileText, GraduationCap, Users, AlertCircle, Search, X, Eye, Pencil, Upload } from 'lucide-react';
import { MAPEL_ALQURAN, mockDataKelompok } from '@/lib/mockKelompok';
import { MOCK_PERIOD, mockKomponenPenilaian } from '@/lib/mockAturPenilaian';
import { buildSiswaList, saveNilaiSiswa, cekStatusKonfigurasi, KategoriStatus } from '@/lib/mockNilaiAlquran';

// ✅ IMPORT MODAL YANG SUDAH DIPISAH
import ConfirmModal from './confirm_modal';
import DetailModal from './detail_modal';
import EditModal from './edit_modal';
import ImportModal from './import_modal';

const THEME = {
    colors: { primary: '#c95b08', secondary: '#e8690a', tertiary: '#f5870a', background: '#ffffff', border: '#fde0c8' },
    gradients: { primary: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)', secondary: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)' },
    shadows: { sm: '0 1px 3px rgba(124, 68, 9, 0.06)' },
};

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.06s; } .scale-in { animation: scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .fade-in { animation: fadeInUp 0.2s ease; }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c9a0; border-radius: 10px; }
    `}</style>
);

export default function InputNilaiClient() {
    const [jenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(MOCK_PERIOD.jenis);
    const [statusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>(MOCK_PERIOD.status_pts);
    const [statusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>(MOCK_PERIOD.status_pas);
    
    const [loading, setLoading] = useState(true);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [selectedKelompokId, setSelectedKelompokId] = useState<string | null>(null);
    const [currentMapel, setCurrentMapel] = useState<any>(null);
    const [currentKelompok, setCurrentKelompok] = useState<any>(null);
    
    const [siswaList, setSiswaList] = useState<any[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataLoading, setDataLoading] = useState(false);
    
    const [kategoriStatus, setKategoriStatus] = useState<KategoriStatus | null>(null);
    const konfigurasiBelumLengkap = kategoriStatus ? !kategoriStatus.configured : false;
    const isReadOnly = (statusPTS !== 'aktif' && statusPAS !== 'aktif') || statusPTS === 'selesai' && statusPAS === 'selesai';

    // Modal States
    const [showDetail, setShowDetail] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editingSiswa, setEditingSiswa] = useState<any>(null);
    const [showImport, setShowImport] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

    useEffect(() => {
        if (selectedMapelId === null || selectedKelompokId === null) {
            setSiswaList([]); setFilteredSiswa([]); setCurrentMapel(null); setCurrentKelompok(null); setKategoriStatus(null); return;
        }
        setDataLoading(true);
        setTimeout(() => {
            const mapped = buildSiswaList(selectedMapelId, selectedKelompokId);
            setSiswaList(mapped); setFilteredSiswa(mapped);
            setCurrentMapel(MAPEL_ALQURAN.find(m => m.id_mapel === selectedMapelId) || null);
            setCurrentKelompok(mockDataKelompok.find(k => k.id_kelompok === selectedKelompokId) || null);
            setCurrentPage(1);
            setKategoriStatus(cekStatusKonfigurasi(selectedMapelId, selectedKelompokId));
            setDataLoading(false);
        }, 300);
    }, [selectedMapelId, selectedKelompokId]);

    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredSiswa(siswaList); }
        else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s => s.nama_lengkap.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, startIndex + itemsPerPage);

    const handleSaveNilai = (nilaiData: Record<number, number | null>) => {
        setIsSaving(true);
        setTimeout(() => {
            saveNilaiSiswa(selectedMapelId!, selectedKelompokId!, editingSiswa.id_siswa, nilaiData);
            const mapped = buildSiswaList(selectedMapelId!, selectedKelompokId!);
            setSiswaList(mapped); setFilteredSiswa(mapped);
            setIsSaving(false); setShowEdit(false); setEditingSiswa(null);
        }, 500);
    };

    if (loading) return <div className="flex-1 p-6 min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" /></div>;

    return (
        <div className="flex-1 p-6 min-h-screen" style={{ background: '#f6f7f9' }}>
            <GlobalStyles />
            
            <div className="mb-6 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-sm mt-1" style={{ color: THEME.colors.primary }}>Kelola nilai komponen & rapor siswa per mata pelajaran & kelompok</p>
            </div>

            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl animate-fade-in-up" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                    <Lock className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
                    <div><p className="text-sm font-bold text-yellow-900 mb-1">Mode Baca Saja</p><p className="text-xs text-yellow-800">Periode penilaian belum aktif atau sudah selesai.</p></div>
                </div>
            )}

            <div className="bg-white rounded-2xl overflow-hidden animate-fade-in-up delay-1" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                <div className="px-6 py-5 space-y-4" style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: '#fffaf6' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>Mata Pelajaran</label>
                            <select value={selectedMapelId ?? ''} onChange={e => { setSelectedMapelId(e.target.value ? Number(e.target.value) : null); setSelectedKelompokId(null); setSearchQuery(''); }} className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {MAPEL_ALQURAN.map(m => <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>)}
                            </select>
                        </div>
                        {selectedMapelId !== null && (
                            <div>
                                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>Kelompok</label>
                                <select value={selectedKelompokId ?? ''} onChange={e => { setSelectedKelompokId(e.target.value || null); setSearchQuery(''); }} className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                                    <option value="">-- Pilih Kelompok --</option>
                                    {mockDataKelompok.map(k => <option key={k.id_kelompok} value={k.id_kelompok}>{k.nama_kelompok}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {selectedMapelId !== null && selectedKelompokId !== null && (
                        <div className="pt-4 border-t" style={{ borderColor: THEME.colors.border }}>
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="relative w-full lg:w-96">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4" style={{ color: THEME.colors.primary }} /></div>
                                    <input type="text" placeholder="Cari nama, NIS, atau NISN..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200 placeholder:text-gray-400" />
                                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center justify-center w-6 h-6 rounded-full hover:bg-orange-100 transition-colors" style={{ color: THEME.colors.primary }}><X className="w-4 h-4" /></button>}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    {!isReadOnly && (
                                        <button onClick={() => setShowImport(true)} disabled={konfigurasiBelumLengkap} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: konfigurasiBelumLengkap ? '#d1d5db' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                                            {konfigurasiBelumLengkap ? <><AlertCircle size={16} /> Belum Diatur</> : <><Upload size={16} /> Import Nilai</>}
                                        </button>
                                    )}
                                    <div className="flex items-center rounded-xl px-4 py-2" style={{ background: '#fff7ed', border: '1.5px solid #fde0c8' }}>
                                        <span className="text-sm font-semibold mr-2" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                        <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm font-bold outline-none cursor-pointer" style={{ background: 'transparent', color: '#c95b08' }}>
                                            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                                        </select>
                                        <span className="text-sm font-semibold ml-2" style={{ color: '#7a3a0a' }}>data</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!selectedMapelId || !selectedKelompokId ? (
                    <div className="m-6 text-center py-16 rounded-2xl" style={{ background: '#fff7f0', border: `2px dashed ${THEME.colors.border}` }}>
                        <GraduationCap size={64} className="mx-auto mb-4" style={{ color: THEME.colors.secondary }} />
                        <p className="text-lg font-bold" style={{ color: THEME.colors.primary }}>{!selectedMapelId ? 'Pilih Mata Pelajaran' : 'Pilih Kelompok'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-sm border-collapse">
                            <thead><tr style={{ background: THEME.gradients.primary }}>
                                {['No.', 'Nama Siswa', 'NIS', 'NISN', ...mockKomponenPenilaian.map(k => k.nama_komponen), 'Rapor', 'Aksi'].map((h, i) => (
                                    <th key={i} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr><td colSpan={7 + mockKomponenPenilaian.length} className="py-12 text-center text-gray-400 text-sm">Memuat data nilai...</td></tr>
                                ) : currentSiswa.length === 0 ? (
                                    <tr><td colSpan={7 + mockKomponenPenilaian.length} className="py-12 text-center text-gray-400 text-sm">{searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}</td></tr>
                                ) : (
                                    currentSiswa.map((siswa, idx) => (
                                        <tr key={siswa.id_siswa} className="transition-colors hover:bg-orange-50/30" style={{ borderBottom: `1px solid ${THEME.colors.border}`, background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}>
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                            <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama_lengkap}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                            {mockKomponenPenilaian.map(k => (
                                                <td key={`${siswa.id_siswa}-${k.id_komponen}`} className="px-4 py-3 text-center text-gray-700">
                                                    {siswa.nilai[k.id_komponen] !== null && siswa.nilai[k.id_komponen] !== undefined ? siswa.nilai[k.id_komponen] : <span className="text-gray-400">—</span>}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: '#fff0e5', color: THEME.colors.primary, border: `1px solid ${THEME.colors.border}` }}>
                                                    {siswa.nilai_rapor ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => { setSelectedSiswa(siswa); setShowDetail(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}><Eye size={13} /> Detail</button>
                                                    <button onClick={() => { setEditingSiswa(siswa); setShowEdit(true); }} disabled={isReadOnly || konfigurasiBelumLengkap} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: (!isReadOnly && !konfigurasiBelumLengkap) ? '#fff0e5' : '#e5e7eb', border: (!isReadOnly && !konfigurasiBelumLengkap) ? `1px solid ${THEME.colors.tertiary}` : '1px solid #d1d5db', color: (!isReadOnly && !konfigurasiBelumLengkap) ? '#b35a08' : '#6b7280' }}>
                                                        {konfigurasiBelumLengkap ? <><AlertCircle size={13} /> Belum</> : <><Pencil size={13} /> Edit</>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {filteredSiswa.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${THEME.colors.border}`, background: '#fafafa' }}>
                                <span className="text-xs font-medium text-gray-500">Halaman {currentPage} dari {totalPages}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold border transition-all disabled:opacity-40" style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>«</button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold border transition-all disabled:opacity-40" style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>»</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== MODALS (SUDAH DIPISAH KE FILE TERSENDIRI) ===== */}
            <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} siswa={selectedSiswa} komponenList={mockKomponenPenilaian} currentKelompok={currentKelompok} canEdit={!isReadOnly && !konfigurasiBelumLengkap} onEdit={() => { setShowDetail(false); setShowEdit(true); }} />
            
            <EditModal isOpen={showEdit} onClose={() => { setShowEdit(false); setEditingSiswa(null); }} siswa={editingSiswa} komponenList={mockKomponenPenilaian} jenisPenilaianAktif={jenisPenilaianAktif} onSave={handleSaveNilai} isSaving={isSaving} />
            
            <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} mapel={currentMapel} kelompok={currentKelompok} komponenList={mockKomponenPenilaian} siswaList={siswaList} onSuccess={() => { setShowImport(false); const mapped = buildSiswaList(selectedMapelId!, selectedKelompokId!); setSiswaList(mapped); setFilteredSiswa(mapped); }} onError={(msg) => alert(msg)} />
        </div>
    );
}