'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
// ✅ Pakai tipe KANONIS dari lib, bukan interface lokal
import { KategoriAkademik } from '@/lib/mockAturPenilaian';

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const MAX_CHAR = { akademik: 190 };

const COLORS = {
    success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    danger: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    warning: { bg: '#fef9c3', text: '#92400e', border: '#fde68a' },
    info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
};

interface BatchEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: KategoriAkademik[];   // ✅ tipe kanonis
    onSave: (data: KategoriAkademik[]) => void;   // ✅ tipe kanonis
    isSaving: boolean;
}

export default function BatchEditModal({ isOpen, onClose, initialData, onSave, isSaving }: BatchEditModalProps) {
    const [closing, setClosing] = useState(false);
    const [data, setData] = useState<KategoriAkademik[]>(initialData);

    // ✅ PERBAIKAN: reset data pakai useEffect (bukan useState yang salah konsep)
    useEffect(() => {
        if (isOpen) {
            setData(initialData);
            setClosing(false);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => { onClose(); setClosing(false); }, 200);
    };

    const addRow = () => setData(prev => [...prev, { id: Date.now(), min_nilai: 0, max_nilai: 100, deskripsi: '' }]);
    const removeRow = (i: number) => setData(prev => prev.filter((_, idx) => idx !== i));
    const updateRow = (i: number, field: keyof KategoriAkademik, value: any) => {
        setData(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
    };

    const validate = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (data.length === 0) return { valid: false, errors: ['Minimal harus ada 1 kategori.'] };
        data.forEach((k, i) => {
            if (isNaN(k.min_nilai) || isNaN(k.max_nilai)) errors.push(`Baris ${i + 1}: Nilai min/max harus angka.`);
            else {
                if (k.min_nilai < 0 || k.max_nilai > 100) errors.push(`Baris ${i + 1}: Nilai harus antara 0-100.`);
                if (k.min_nilai >= k.max_nilai) errors.push(`Baris ${i + 1}: Min (${k.min_nilai}) harus < Max (${k.max_nilai}).`);
                if ((k.max_nilai - k.min_nilai) < 3) errors.push(`Baris ${i + 1}: Range nilai minimal 3 poin.`);
            }
            if (!k.deskripsi || k.deskripsi.trim().length < 3) errors.push(`Baris ${i + 1}: Deskripsi minimal 3 karakter.`);
            else if (k.deskripsi.trim().length > MAX_CHAR.akademik) errors.push(`Baris ${i + 1}: Deskripsi maksimal ${MAX_CHAR.akademik} karakter.`);
        });
        const sorted = [...data].sort((a, b) => a.min_nilai - b.min_nilai);
        const covered = new Set<number>(); let overlap = false;
        sorted.forEach(k => {
            for (let i = Math.floor(k.min_nilai); i <= Math.floor(k.max_nilai); i++) {
                if (covered.has(i)) overlap = true;
                covered.add(i);
            }
        });
        if (overlap) errors.push('Ada overlap pada range nilai.');
        return { valid: errors.length === 0, errors };
    };

    const handleSave = () => {
        const v = validate();
        if (!v.valid) return; // tombol sudah disabled saat invalid, ini pengaman ganda
        // ✅ id dijamin number: pakai id existing ATAU fallback (i+1)
        onSave(data.map((k, i) => ({
            id: k.id ?? (i + 1),
            min_nilai: Math.floor(k.min_nilai),
            max_nilai: Math.floor(k.max_nilai),
            deskripsi: k.deskripsi.trim(),
        })));
    };

    const validation = validate();
    const hasOverLimit = data.some(k => (k.deskripsi || '').trim().length > MAX_CHAR.akademik);

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>
                <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><FileText size={20} className="text-white" /></div>
                        <div><h2 className="text-base font-bold text-white">Edit Kategori Akademik</h2><p className="text-xs text-white/80 mt-0.5">Kelola semua kategori sekaligus</p></div>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.2)' }}><X size={16} className="text-white" /></button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-4 sm:p-6 space-y-4">
                        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}` }}>
                            <Info size={16} style={{ color: COLORS.info.text }} className="mt-0.5 flex-shrink-0" />
                            <p className="text-xs" style={{ color: COLORS.info.text }}><strong>Tips:</strong> Pastikan range 0-100 lengkap tanpa overlap dan minimal 3 poin per kategori.</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-700">Kategori ({data.length})</h3>
                            <button onClick={addRow} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all" style={{ background: COLORS.info.bg, color: COLORS.info.text, border: `1px solid ${COLORS.info.border}` }}>
                                <Plus size={14} /> Tambah Baris
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.map((k, index) => {
                                const errs: string[] = [];
                                if (isNaN(k.min_nilai) || isNaN(k.max_nilai)) errs.push('Nilai tidak valid');
                                else if (k.min_nilai >= k.max_nilai) errs.push('Min >= Max');
                                else if ((k.max_nilai - k.min_nilai) < 3) errs.push('Range minimal 3 poin');
                                if (!k.deskripsi || k.deskripsi.trim().length < 3) errs.push('Deskripsi minimal 3 karakter');

                                return (
                                    <div key={k.id} className="p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: BRAND_GRADIENT }}>{index + 1}</div>
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold mb-1.5 text-gray-600">Min <span className="text-red-500">*</span></label>
                                                    <input type="number" min="0" max="100" value={k.min_nilai} onChange={(e) => updateRow(index, 'min_nilai', parseInt(e.target.value) || 0)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold mb-1.5 text-gray-600">Max <span className="text-red-500">*</span></label>
                                                    <input type="number" min="0" max="100" value={k.max_nilai} onChange={(e) => updateRow(index, 'max_nilai', parseInt(e.target.value) || 0)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold mb-1.5 text-gray-600">Deskripsi <span className="text-red-500">*</span></label>
                                                    <input type="text" value={k.deskripsi} onChange={(e) => updateRow(index, 'deskripsi', e.target.value)} className={inputCls} placeholder="Sangat Baik" />
                                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold">
                                                        <span className={(k.deskripsi || '').length > MAX_CHAR.akademik ? 'text-red-600' : 'text-gray-400'}>{(k.deskripsi || '').length}/{MAX_CHAR.akademik} karakter</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {data.length > 1 && (
                                                <button onClick={() => removeRow(index)} className="mt-7 p-2 rounded-lg transition-colors" style={{ background: COLORS.danger.bg, border: `1.5px solid ${COLORS.danger.border}`, color: COLORS.danger.text }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        {errs.length > 0 && (
                                            <div className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: COLORS.danger.bg, color: COLORS.danger.text, border: `1px solid ${COLORS.danger.border}` }}>
                                                <AlertCircle size={12} /> {errs.join(' | ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: validation.valid ? COLORS.success.bg : COLORS.warning.bg, border: `1.5px solid ${validation.valid ? COLORS.success.border : COLORS.warning.border}`, color: validation.valid ? COLORS.success.text : COLORS.warning.text }}>
                            {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <strong>Status:</strong> {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                        </div>
                    </div>
                </div>

                <div className="px-4 sm:px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                    {hasOverLimit && <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mr-auto"><AlertTriangle size={11} /> Ada deskripsi melebihi {MAX_CHAR.akademik} karakter — persingkat dulu</p>}
                    <button onClick={handleClose} disabled={isSaving} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                    <button onClick={handleSave} disabled={isSaving || !validation.valid || hasOverLimit} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: BRAND_GRADIENT, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }}>
                        {isSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</> : <><span>Simpan {data.length} Kategori</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
}