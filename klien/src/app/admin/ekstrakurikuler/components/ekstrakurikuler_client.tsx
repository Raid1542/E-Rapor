/**
 * Nama File: ekstrakurikuler_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data ekstrakurikuler oleh admin.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Pencil, Plus, Trash2, Search, X } from 'lucide-react';

interface Ekstrakurikuler {
    id: number;
    nama_ekskul: string;
    nama_pembina: string | null;
    jumlah_anggota: number;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_aktif: boolean;
}

export default function DataEkstrakurikulerPage() {

    const [ekskulList, setEkskulList] = useState<Ekstrakurikuler[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
    const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);

    const [formData, setFormData] = useState({ nama_ekskul: '', nama_pembina: '', confirmData: false });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const focusClass = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

    const fetchTahunAjaran = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { alert('Silakan login terlebih dahulu'); return; }
            const res = await fetch("http://localhost:5000/api/admin/tahun-ajaran", { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success) {
                const options = data.data.map((ta: any) => ({ id: ta.id_tahun_ajaran, tahun_ajaran: ta.tahun_ajaran, semester: (ta.semester || 'ganjil').toLowerCase(), is_aktif: ta.status === 'aktif' }));
                setTahunAjaranList(options);
            }
        } catch (err) { console.error('Gagal ambil tahun ajaran:', err); alert('Gagal terhubung ke server'); }
    };

    const fetchEkskul = async (tahunAjaranId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { alert('Silakan login terlebih dahulu'); return; }
            const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler?tahun_ajaran_id=${tahunAjaranId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
                const camelCasedData = (Array.isArray(data.data) ? data.data : []).map((ekskul: any) => ({ id: ekskul.id_ekskul, nama_ekskul: ekskul.nama_ekskul, nama_pembina: ekskul.nama_pembina || '-', jumlah_anggota: ekskul.jumlah_anggota || 0 }));
                setEkskulList(camelCasedData);
            } else { alert('Gagal memuat data ekstrakurikuler: ' + (data.message || 'Tidak terotorisasi')); }
        } catch (err) { console.error('Error fetch ekstrakurikuler:', err); alert('Gagal terhubung ke server'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTahunAjaran(); }, []);
    useEffect(() => { if (selectedTahunAjaranId) { setLoading(true); fetchEkskul(selectedTahunAjaranId); } }, [selectedTahunAjaranId]);

    const filteredEkskul = ekskulList.filter((ekskul) => {
        const query = searchQuery.toLowerCase().trim();
        return (!query || ekskul.nama_ekskul.toLowerCase().includes(query) || (ekskul.nama_pembina && ekskul.nama_pembina.toLowerCase().includes(query)));
    });

    const totalPages = Math.max(1, Math.ceil(filteredEkskul.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentEkskul = filteredEkskul.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: JSX.Element[] = [];
        const maxVisible = 5;
        if (currentPage > 1) pages.push(<button key="prev" onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">«</button>);
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
        } else {
            pages.push(<button key={1} onClick={() => setCurrentPage(1)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === 1 ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>1</button>);
            if (currentPage > 3) pages.push(<span key="dots1" className="px-2 text-gray-600">...</span>);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
            if (currentPage < totalPages - 2) pages.push(<span key="dots2" className="px-2 text-gray-600">...</span>);
            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === totalPages ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{totalPages}</button>);
        }
        if (currentPage < totalPages) pages.push(<button key="next" onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">»</button>);
        return pages;
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nama_ekskul?.trim()) newErrors.nama_ekskul = 'Nama ekstrakurikuler wajib diisi';
        if (!formData.confirmData) newErrors.confirmData = 'Harap centang kotak konfirmasi sebelum melanjutkan!';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitTambah = async () => {
        if (!validate()) return;
        const token = localStorage.getItem('token');
        if (!token) { alert('Sesi login telah habis. Silakan login ulang.'); return; }
        try {
            const res = await fetch("http://localhost:5000/api/admin/ekstrakurikuler", { method: "POST", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ nama_ekskul: formData.nama_ekskul, nama_pembina: formData.nama_pembina || null, tahun_ajaran_id: selectedTahunAjaranId }) });
            if (res.ok) { alert("Ekstrakurikuler berhasil ditambahkan"); setShowTambah(false); if (selectedTahunAjaranId) fetchEkskul(selectedTahunAjaranId); handleReset(); }
            else { const error = await res.json(); alert(error.message || "Gagal menambah ekstrakurikuler"); }
        } catch (err) { alert("Gagal terhubung ke server"); }
    };

    const handleSubmitEdit = async () => {
        if (!validate() || editId === null) return;
        const token = localStorage.getItem('token');
        if (!token) { alert('Sesi login telah habis. Silakan login ulang.'); return; }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${editId}`, { method: "PUT", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ nama_ekskul: formData.nama_ekskul, nama_pembina: formData.nama_pembina || null, tahun_ajaran_id: selectedTahunAjaranId }) });
            if (res.ok) { alert("Data ekstrakurikuler berhasil diperbarui"); setShowEdit(false); setEditId(null); if (selectedTahunAjaranId) fetchEkskul(selectedTahunAjaranId); handleReset(); }
            else { const error = await res.json(); alert(error.message || "Gagal memperbarui data ekstrakurikuler"); }
        } catch (err) { alert("Gagal terhubung ke server"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus ekstrakurikuler ini?')) return;
        const token = localStorage.getItem('token');
        if (!token) { alert('Sesi login habis.'); return; }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${id}`, { method: "DELETE", headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) { alert("Ekstrakurikuler berhasil dihapus"); if (selectedTahunAjaranId) fetchEkskul(selectedTahunAjaranId); }
            else { const err = await res.json(); alert(err.message || "Gagal menghapus ekstrakurikuler"); }
        } catch (err) { alert("Gagal terhubung ke server"); }
    };

    const handleReset = () => { setFormData({ nama_ekskul: '', nama_pembina: '', confirmData: false }); setErrors({}); };

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Data Ekstrakurikuler</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">{isEdit ? 'Edit Data Ekstrakurikuler' : 'Tambah Data Ekstrakurikuler'}</h2>
                        <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Ekstrakurikuler <span className="text-red-500">*</span></label>
                            <input type="text" name="nama_ekskul" value={formData.nama_ekskul} onChange={handleInputChange} placeholder="Contoh: Pramuka" className={`w-full border ${errors.nama_ekskul ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 ${focusClass}`} />
                            {errors.nama_ekskul && <p className="text-red-500 text-xs mt-1">{errors.nama_ekskul}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pembina</label>
                            <input type="text" name="nama_pembina" value={formData.nama_pembina} onChange={handleInputChange} placeholder="Nama pembina" className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 ${focusClass}`} />
                        </div>
                        <div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input type="checkbox" name="confirmData" checked={formData.confirmData} onChange={(e) => setFormData(prev => ({ ...prev, confirmData: e.target.checked }))} className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                                <span className="text-sm text-gray-700">Saya yakin sudah mengisi dengan benar</span>
                            </label>
                            {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
                        </div>
                    </div>
                    <div className="mt-6 flex gap-3 pt-2">
                        <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded hover:bg-gray-100 transition text-sm">Batal</button>
                        <button onClick={isEdit ? handleSubmitEdit : handleSubmitTambah} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded transition text-sm">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    return (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Ekstrakurikuler</h1>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Ajaran</label>
                        <select value={selectedTahunAjaranId ?? ''} onChange={(e) => { const value = e.target.value; if (value === '') { setSelectedTahunAjaranId(null); setSelectedTahunAjaranAktif(false); setLoading(false); return; } const id = Number(value); const selectedTa = tahunAjaranList.find(ta => ta.id === id); setSelectedTahunAjaranId(id); setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false); setLoading(true); fetchEkskul(id); }} className={`w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm ${focusClass}`}>
                            <option value="">-- Pilih Tahun Ajaran --</option>
                            {tahunAjaranList.map(ta => { const semesterDisplay = ta.semester === 'ganjil' ? 'Ganjil' : 'Genap'; return (<option key={ta.id} value={ta.id}>{ta.tahun_ajaran} {semesterDisplay} {ta.is_aktif ? "(Aktif)" : ""}</option>); })}
                        </select>
                    </div>

                    {selectedTahunAjaranId === null ? (
                        <div className="mt-8 text-center py-8 bg-orange-50 border border-dashed border-orange-300 rounded-lg">
                            <p className="text-orange-800 text-lg font-medium">Pilih Tahun Ajaran Terlebih Dahulu.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    {selectedTahunAjaranAktif && (
                                        <button onClick={() => setShowTambah(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"><Plus size={20} /> Tambah Ekstrakurikuler</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="text-gray-700 text-sm">Tampilkan</span>
                                        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={`border border-gray-300 rounded px-3 py-1 text-sm ${focusClass}`}>
                                            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                                        </select>
                                        <span className="text-gray-700 text-sm">data</span>
                                    </div>
                                    <div className="relative min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-gray-400" /></div>
                                        <input type="text" placeholder="Pencarian" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className={`w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm ${focusClass}`} />
                                        {searchQuery && (<button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>)}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                <table className="w-full min-w-[600px] table-auto text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No.</th>
                                            <th className="px-4 py-3 text-left sticky top-0 bg-gray-800 text-white z-10 font-semibold">Nama Ekstrakurikuler</th>
                                            <th className="px-4 py-3 text-left sticky top-0 bg-gray-800 text-white z-10 font-semibold">Pembina</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Jumlah Anggota</th>
                                            {selectedTahunAjaranAktif ? (
                                                <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Aksi</th>
                                            ) : (
                                                <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Detail</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                                        ) : filteredEkskul.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada data ekstrakurikuler</td></tr>
                                        ) : (
                                            currentEkskul.map((ekskul, index) => (
                                                <tr key={ekskul.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                                    <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                                                    <td className="px-4 py-3 align-middle font-medium">{ekskul.nama_ekskul}</td>
                                                    <td className="px-4 py-3 align-middle">{ekskul.nama_pembina}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{ekskul.jumlah_anggota}</td>
                                                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                        <div className="flex justify-center gap-1 sm:gap-2">
                                                            {selectedTahunAjaranAktif && (
                                                                <>
                                                                    <button onClick={() => { setEditId(ekskul.id); setFormData({ nama_ekskul: ekskul.nama_ekskul, nama_pembina: ekskul.nama_pembina || '', confirmData: false }); setShowEdit(true); }} className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"><Pencil size={16} /><span className="hidden sm:inline">Edit</span></button>
                                                                    <button onClick={() => handleDelete(ekskul.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"><Trash2 size={16} /><span className="hidden sm:inline">Hapus</span></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredEkskul.length > 0 && (
                                <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                                    <div className="text-sm text-gray-600">Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredEkskul.length)} dari {filteredEkskul.length} data</div>
                                    <div className="flex gap-1 flex-wrap justify-center">{renderPagination()}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}