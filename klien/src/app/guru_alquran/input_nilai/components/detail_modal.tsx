'use client';
import { useState } from 'react';
import { X, BookOpen, Pencil } from 'lucide-react';

const THEME = {
    colors: { primary: '#c95b08', secondary: '#e8690a', border: '#fde0c8' },
    gradients: { secondary: 'linear-gradient(135deg,#e8690a,#f5870a)', header: 'linear-gradient(120deg,#b6500a,#e8690a 45%,#f5a623)' },
    shadows: { sm: '0 1px 3px rgba(124,68,9,0.06)' },
};

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    siswa: any;
    komponenList: any[];
    currentKelompok: any;
    canEdit: boolean;
    onEdit: () => void;
}

export default function DetailModal({ isOpen, onClose, siswa, komponenList, currentKelompok, canEdit, onEdit }: DetailModalProps) {
    const [closing, setClosing] = useState(false);
    if (!isOpen || !siswa) return null;

    const close = () => { setClosing(true); setTimeout(() => { onClose(); setClosing(false); }, 200); };

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ border: `1px solid ${THEME.colors.border}` }}>
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: THEME.gradients.header }}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}><BookOpen size={24} className="text-white" /></div>
                        <div><h2 className="text-base font-bold text-white">Detail Nilai Siswa</h2><p className="text-xs text-white/80 mt-0.5">{siswa.nama_lengkap} • {currentKelompok?.nama_kelompok}</p></div>
                    </div>
                    <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}><X size={16} className="text-white" /></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        {[['NIS', siswa.nis], ['NISN', siswa.nisn], ['Kelas Asal', siswa.kelas_asal]].map(([label, val], i) => (
                            <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#fff7ed', border: `1px solid ${THEME.colors.border}` }}>
                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>{label}</p>
                                <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{val || '-'}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 rounded-full" style={{ background: THEME.colors.secondary }}></div><p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor Penilaian</p></div>
                        <div className="rounded-xl p-5 border-2" style={{ background: (siswa.nilai_rapor ?? 0) > 0 ? '#fff7ed' : '#f9fafb', borderColor: (siswa.nilai_rapor ?? 0) > 0 ? '#fdba74' : '#e5e7eb' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: (siswa.nilai_rapor ?? 0) > 0 ? '#fed7aa' : '#e5e7eb' }}><span className="text-sm font-bold" style={{ color: (siswa.nilai_rapor ?? 0) > 0 ? '#c2410c' : '#6b7280' }}>RAPOR</span></div>
                                <div><p className="text-sm font-bold" style={{ color: (siswa.nilai_rapor ?? 0) > 0 ? '#7a3a0a' : '#9ca3af' }}>Nilai Rapor Akhir</p><p className="text-xs" style={{ color: '#a89a8c' }}>{(siswa.nilai_rapor ?? 0) > 0 ? 'Terhitung dari bobot' : 'Belum lengkap'}</p></div>
                            </div>
                            <div className="text-center py-3"><div className="text-3xl font-bold mb-2" style={{ color: (siswa.nilai_rapor ?? 0) > 0 ? '#c2410c' : '#d1d5db' }}>{(siswa.nilai_rapor ?? 0) > 0 ? siswa.nilai_rapor : '—'}</div></div>
                            <div className="pt-4 border-t" style={{ borderColor: (siswa.nilai_rapor ?? 0) > 0 ? '#fde0c8' : '#e5e7eb' }}>
                                <p className="text-xs font-semibold mb-2" style={{ color: (siswa.nilai_rapor ?? 0) > 0 ? '#7a3a0a' : '#9ca3af' }}>Deskripsi:</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{siswa.deskripsi || <span className="italic text-gray-400">Belum ada deskripsi</span>}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 rounded-full" style={{ background: THEME.colors.secondary }}></div><p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Komponen Penilaian</p></div>
                        <div className="space-y-3">
                            {komponenList.map((k: any) => {
                                const nilai = siswa.nilai[k.id_komponen];
                                const hasValue = nilai !== null && nilai !== undefined;
                                return (
                                    <div key={k.id_komponen} className="flex items-center justify-between px-5 py-4 rounded-xl border" style={{ background: hasValue ? '#fff' : '#f9fafb', borderColor: hasValue ? '#fde0c8' : '#e5e7eb' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7', color: '#92400e' }}><span className="text-xs font-bold">{k.nama_komponen.slice(0, 3).toUpperCase()}</span></div>
                                            <div><p className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>{k.nama_komponen}</p></div>
                                        </div>
                                        <p className={`text-xl font-bold ${hasValue ? '' : 'text-gray-400'}`} style={{ color: hasValue ? THEME.colors.primary : undefined }}>{hasValue ? nilai : '—'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                    <button onClick={close} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Tutup</button>
                    {canEdit && <button onClick={() => { close(); setTimeout(onEdit, 220); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2" style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}><Pencil size={14} /> Edit Nilai</button>}
                </div>
            </div>
        </div>
    );
}