'use client';
import { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getNilaiSiswa, saveNilaiSiswa } from '@/lib/mockNilaiAlquran';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    mapel: any;
    kelompok: any;
    komponenList: any[];
    siswaList: any[];
    onSuccess: () => void;
    onError: (msg: string) => void;
}

export default function ImportModal({ isOpen, onClose, mapel, kelompok, komponenList, siswaList, onSuccess, onError }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        if (!mapel || !kelompok) return;
        setDownloading(true);
        const headers = ['Nama', 'NIS', ...komponenList.map((k: any) => k.nama_komponen)];
        const rows = siswaList.map((s: any) => {
            const nilaiSiswa = getNilaiSiswa(mapel.id_mapel, kelompok.id_kelompok, s.id_siswa);
            return [s.nama_lengkap, s.nis, ...komponenList.map((k: any) => nilaiSiswa[k.id_komponen] !== null && nilaiSiswa[k.id_komponen] !== undefined ? nilaiSiswa[k.id_komponen] : '')];
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Template_Nilai_${mapel.nama_mapel}_${kelompok.nama_kelompok}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setDownloading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!/\.(csv|xlsx|xls)$/i.test(f.name)) { onError('Format tidak valid. Gunakan file .csv'); return; }
        if (f.size > 10 * 1024 * 1024) { onError('Ukuran file maksimal 10MB'); return; }
        setFile(f);
    };

    const executeImport = () => {
        if (!file || !mapel || !kelompok) return;
        if (!/\.csv$/i.test(file.name)) { onError('Versi mock frontend hanya mendukung file .csv'); return; }
        setImporting(true);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result).replace(/^\uFEFF/, '');
                const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
                if (lines.length < 2) throw new Error('File kosong atau hanya berisi header.');
                
                const headers = lines[0].split(',').map((h: string) => h.trim());
                const colMap: Record<number, number> = {};
                komponenList.forEach((k: any) => {
                    const idx = headers.findIndex((h: string) => h.toLowerCase() === k.nama_komponen.toLowerCase());
                    if (idx >= 0) colMap[k.id_komponen] = idx;
                });
                
                const nisIdx = headers.findIndex((h: string) => h.toLowerCase() === 'nis');
                if (nisIdx < 0) throw new Error('Kolom "NIS" tidak ditemukan.');

                let updatedCount = 0;
                for (let i = 1; i < lines.length; i++) {
                    const cells = lines[i].split(',');
                    const nis = (cells[nisIdx] || '').trim();
                    const siswa = siswaList.find((s: any) => s.nis === nis);
                    if (!siswa) continue;

                    const mergedNilai: Record<number, number | null> = { ...getNilaiSiswa(mapel.id_mapel, kelompok.id_kelompok, siswa.id_siswa) };
                    let changed = false;
                    for (const [idStr, colIdx] of Object.entries(colMap)) {
                        const raw = (cells[Number(colIdx)] || '').trim();
                        if (raw === '') continue;
                        const num = parseInt(raw, 10);
                        if (isNaN(num) || num < 0 || num > 100) throw new Error(`Baris ${i + 1} (NIS: ${nis}): nilai "${raw}" tidak valid.`);
                        mergedNilai[Number(idStr)] = num;
                        changed = true;
                    }
                    if (changed) {
                        saveNilaiSiswa(mapel.id_mapel, kelompok.id_kelompok, siswa.id_siswa, mergedNilai);
                        updatedCount++;
                    }
                }
                if (updatedCount === 0) throw new Error('Tidak ada data yang diperbarui.');
                setImporting(false); setFile(null);
                if (inputRef.current) inputRef.current.value = '';
                onSuccess();
            } catch (err: any) {
                setImporting(false);
                onError(err.message || 'Gagal memproses file import.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 fade-in" onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose(); }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0"><Upload size={24} className="text-green-600" /></div>
                        <div><h3 className="text-lg font-bold text-gray-900">Import Nilai</h3><p className="text-xs text-gray-500">{mapel?.nama_mapel} • {kelompok?.nama_kelompok}</p></div>
                    </div>
                    <button onClick={() => { if (!importing) onClose(); }} disabled={importing} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-blue-600" /> Langkah Import:</p>
                    <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Download template CSV</li><li>Isi nilai (0-100)</li><li>Kosongkan sel jika nilai belum ada (data lama AMAN)</li><li>Upload kembali file ini</li>
                    </ol>
                </div>
                <div className="mb-5">
                    <button onClick={downloadTemplate} disabled={downloading} className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                        {downloading ? 'Mengunduh...' : <><Download size={16} /> Download Template CSV</>}
                    </button>
                </div>
                <div className="mb-5">
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#7a3a0a' }}>Upload File <span className="text-red-500">*</span></label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${file ? 'border-green-400 bg-green-50' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'}`} onClick={() => inputRef.current?.click()}>
                        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                        {file ? (
                            <div className="flex flex-col items-center gap-2"><CheckCircle2 size={32} className="text-green-600" /><p className="text-sm font-bold text-green-900">{file.name}</p><p className="text-xs text-green-700">{(file.size / 1024).toFixed(1)} KB</p></div>
                        ) : (
                            <div className="flex flex-col items-center gap-2"><Upload size={32} className="text-orange-400" /><p className="text-sm font-bold text-orange-900">Klik untuk pilih file</p><p className="text-xs text-orange-700">Format: .csv (Maks 10MB)</p></div>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { onClose(); setFile(null); }} disabled={importing} className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                    <button onClick={executeImport} disabled={!file || importing} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        {importing ? 'Mengimport...' : <><Upload size={16} /> Import Nilai</>}
                    </button>
                </div>
            </div>
        </div>
    );
}