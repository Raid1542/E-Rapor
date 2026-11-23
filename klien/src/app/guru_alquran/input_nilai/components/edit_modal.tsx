'use client';
import { useState, useEffect } from 'react';
import { X, Info, Lock, CheckCircle2 } from 'lucide-react';

const THEME = {
    colors: { secondary: '#e8690a', border: '#fde0c8' },
    gradients: { header: 'linear-gradient(120deg,#b6500a,#e8690a 45%,#f5a623)', secondary: 'linear-gradient(135deg,#e8690a,#f5870a)' },
    shadows: { sm: '0 1px 3px rgba(124,68,9,0.06)' },
};

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    siswa: any;
    komponenList: any[];
    jenisPenilaianAktif: string | null;
    onSave: (nilai: Record<number, number | null>) => void;
    isSaving: boolean;
}

export default function EditModal({ isOpen, onClose, siswa, komponenList, jenisPenilaianAktif, onSave, isSaving }: EditModalProps) {
    const [closing, setClosing] = useState(false);
    const [editingNilai, setEditingNilai] = useState<Record<number, number | null>>({});
    const [errors, setErrors] = useState<Record<number, string>>({});

    useEffect(() => {
        if (isOpen && siswa) { setEditingNilai({ ...siswa.nilai }); setErrors({}); }
    }, [isOpen, siswa]);

    if (!isOpen || !siswa) return null;
    const close = () => { setClosing(true); setTimeout(() => { onClose(); setClosing(false); }, 200); };

    const validate = (id: number, val: number | null) => {
        if (val === null) return null;
        if (isNaN(val)) return 'Harus angka';
        if (val < 0) return '< 0';
        if (val > 100) return '> 100';
        return null;
    };

    const handleChange = (id: number, value: string) => {
        if (value === '' || /^\d+$/.test(value)) {
            const newVal = value === '' ? null : parseInt(value, 10);
            setEditingNilai(prev => ({ ...prev, [id]: newVal }));
            const err = validate(id, newVal);
            setErrors(prev => { const n = { ...prev }; if (err) n[id] = err; else delete n[id]; return n; });
        }
    };

    const handleSave = () => {
        const hasErr = Object.values(errors).length > 0;
        if (hasErr) return;
        setClosing(true);
        setTimeout(() => { onSave(editingNilai); setClosing(false); }, 200);
    };

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ border: `1px solid ${THEME.colors.border}` }}>
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: THEME.gradients.header }}>
                    <div><h2 className="text-base font-bold text-white">Edit Nilai Siswa</h2><p className="text-xs text-white/80 mt-0.5">{siswa.nama_lengkap}</p></div>
                    <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}><X size={16} className="text-white" /></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
                    {jenisPenilaianAktif && (
                        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                            <Info size={18} style={{ color: '#c2410c', flexShrink: 0 }} />
                            <p className="text-sm" style={{ color: '#7a3a0a' }}><strong>Periode {jenisPenilaianAktif} Aktif</strong> — {jenisPenilaianAktif === 'PTS' ? 'Hanya nilai PTS yang dapat diubah.' : 'Nilai PTS terkunci, hanya UH & PAS yang bisa diubah.'}</p>
                        </div>
                    )}
                    <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}>
                        <Info size={18} style={{ color: '#1d4ed8', flexShrink: 0 }} className="mt-0.5" />
                        <p className="text-xs" style={{ color: '#1e40af' }}><strong>Validasi:</strong> Angka <strong>0-100</strong>. Kosongkan untuk menghapus nilai.</p>
                    </div>
                    <div className="space-y-3">
                        {komponenList.map((k: any) => {
                            const isDisabled = jenisPenilaianAktif === 'PTS' && k.nama_komponen.toUpperCase() !== 'PTS';
                            const nilai = editingNilai[k.id_komponen];
                            const error = errors[k.id_komponen];
                            return (
                                <div key={k.id_komponen} className="flex items-center justify-between px-5 py-4 rounded-xl border" style={{ background: isDisabled ? '#f9fafb' : (error ? '#fef2f2' : '#fffaf6'), borderColor: isDisabled ? '#e5e7eb' : (error ? '#fca5a5' : '#fde0c8') }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7', color: '#92400e' }}><span className="text-xs font-bold">{k.nama_komponen.slice(0, 3).toUpperCase()}</span></div>
                                        <div><p className="text-sm font-semibold" style={{ color: isDisabled ? '#9ca3af' : '#7a3a0a' }}>{k.nama_komponen}</p></div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={nilai ?? ''} onChange={e => handleChange(k.id_komponen, e.target.value)} disabled={isSaving || isDisabled} placeholder="-" maxLength={3}
                                            className={`w-24 h-12 px-3 text-center text-lg font-bold rounded-lg border-2 outline-none transition-all ${isDisabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : (error ? 'bg-red-50 border-red-500 text-gray-800' : 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400')}`} />
                                        {error && <p className="text-xs text-red-600 mt-1 text-center font-semibold">{error}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                    <button onClick={close} disabled={isSaving} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                    <button onClick={handleSave} disabled={isSaving || Object.values(errors).length > 0} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 disabled:opacity-50" style={{ background: THEME.gradients.secondary, boxShadow: THEME.shadows.sm }}>
                        {isSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</> : <><CheckCircle2 size={16} /> Simpan Nilai</>}
                    </button>
                </div>
            </div>
        </div>
    );
}