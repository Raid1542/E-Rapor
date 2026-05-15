/**
 * Nama File: data_pembelajaran_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data pembelajaran oleh admin.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';
import { useState, useEffect, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, Filter } from 'lucide-react';

interface Pembelajaran {
    id: number;
    nama_mapel: string;
    nama_kelas: string;
    nama_guru: string;
    user_id: number;
    id_mapel: number;
    id_kelas: number;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_aktif: boolean;
}

interface DropdownItem {
    id: number;
    nama: string;
}

interface FormDataType {
    user_id: string;
    id_mapel: string;
    id_kelas: string;
    confirmData: boolean;
}

export default function DataPembelajaranPage() {

    const [dataList, setDataList] = useState<Pembelajaran[]>([]);
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

    const [guruList, setGuruList] = useState<DropdownItem[]>([]);
    const [mapelList, setMapelList] = useState<DropdownItem[]>([]);
    const [kelasList, setKelasList] = useState<DropdownItem[]>([]);
    const [dropdownLoading, setDropdownLoading] = useState(false);

    const [showFilter, setShowFilter] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [filterValues, setFilterValues] = useState({ kelas: '', mapel: '' });
    const [openedFilterValues, setOpenedFilterValues] = useState({ kelas: '', mapel: '' });

    const [formData, setFormData] = useState<FormDataType>({ user_id: '', id_mapel: '', id_kelas: '', confirmData: false });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const focusClass = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

    const apiFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token tidak ditemukan');
        const res = await fetch(url, { ...options, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Operasi gagal');
        return data;
    };

    const fetchTahunAjaran = async () => {
        try {
            const data = await apiFetch("http://localhost:5000/api/admin/tahun-ajaran");
            const options = data.data.map((ta: any) => ({ id: ta.id_tahun_ajaran, tahun_ajaran: ta.tahun_ajaran, semester: (ta.semester || 'ganjil').toLowerCase(), is_aktif: ta.status === 'aktif' }));
            setTahunAjaranList(options);
        } catch (err) { console.error('Gagal ambil tahun ajaran:', err); alert('Gagal memuat data tahun ajaran'); }
    };

    const fetchAllDropdowns = async () => {
        setDropdownLoading(true);
        try {
            const data = await apiFetch("http://localhost:5000/api/admin/pembelajaran/dropdown");
            setGuruList(data.data.guru || []);
            setKelasList(data.data.kelas || []);
            setMapelList(data.data.mata_pelajaran || []);
        } catch (err) { console.error('Gagal muat dropdown:', err); alert('Gagal memuat data dropdown'); }
        finally { setDropdownLoading(false); }
    };

    const fetchData = async (taId: number) => {
        setLoading(true);
        try {
            const data = await apiFetch("http://localhost:5000/api/admin/pembelajaran");
            const list = (data.data || []).map((item: any) => ({ id: item.id, nama_mapel: item.nama_mapel || 'Mapel Tidak Ditemukan', nama_kelas: item.nama_kelas, nama_guru: item.nama_guru || 'Belum ditetapkan', user_id: item.user_id, id_mapel: item.mata_pelajaran_id, id_kelas: item.kelas_id }));
            setDataList(list);
        } catch (err) { console.error('Error fetch pembelajaran:', err); alert('Gagal memuat data pembelajaran'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTahunAjaran(); }, []);
    useEffect(() => { if (selectedTahunAjaranId) { fetchData(selectedTahunAjaranId); if (selectedTahunAjaranAktif) { fetchAllDropdowns(); } } }, [selectedTahunAjaranId, selectedTahunAjaranAktif]);

    const closeFilterModal = () => { setFilterClosing(true); setTimeout(() => { setFilterValues(openedFilterValues); setShowFilter(false); setFilterClosing(false); }, 200); };

    const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.user_id) newErrors.user_id = 'Pilih guru';
        if (!formData.id_mapel) newErrors.id_mapel = 'Pilih mata pelajaran';
        if (!formData.id_kelas) newErrors.id_kelas = 'Pilih kelas';
        if (!formData.confirmData) newErrors.confirmData = 'Harap konfirmasi data';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (isEdit: boolean) => {
        if (!validate()) { const missing = []; if (!formData.user_id) missing.push('Guru'); if (!formData.id_mapel) missing.push('Mata Pelajaran'); if (!formData.id_kelas) missing.push('Kelas'); if (!formData.confirmData) missing.push('Konfirmasi'); alert(`Belum lengkap! Mohon isi: ${missing.join(', ')}`); return; }
        const payload = { user_id: Number(formData.user_id), mata_pelajaran_id: Number(formData.id_mapel), kelas_id: Number(formData.id_kelas) };
        try {
            const url = isEdit ? `http://localhost:5000/api/admin/pembelajaran/${editId}` : `http://localhost:5000/api/admin/pembelajaran`;
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(payload) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Error ${res.status}`); }
            alert(isEdit ? 'Data pembelajaran berhasil diperbarui' : 'Data pembelajaran berhasil ditambahkan');
            if (selectedTahunAjaranId) { fetchData(selectedTahunAjaranId); }
            setShowTambah(false); setShowEdit(false);
            setFormData({ user_id: '', id_mapel: '', id_kelas: '', confirmData: false });
        } catch (err) { console.error('Submit error:', err); alert('Gagal menyimpan: ' + (err instanceof Error ? err.message : 'Cek koneksi')); }
    };

    const handleDelete = async (id: number) => {
        if (!id) { alert('ID tidak valid'); return; }
        if (!confirm('Yakin ingin menghapus data pembelajaran ini?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            if (!res.ok) { const err = await res.json(); throw new Error(err.message || `HTTP ${res.status}`); }
            alert('Data pembelajaran berhasil dihapus');
            if (selectedTahunAjaranId) { fetchData(selectedTahunAjaranId); }
        } catch (err) { console.error('Delete error:', err); alert('Gagal menghapus: ' + (err instanceof Error ? err.message : 'Cek koneksi')); }
    };

    const filteredData = dataList.filter(item => {
        const matchesSearch = !searchQuery || item.nama_mapel.toLowerCase().includes(searchQuery.toLowerCase()) || item.nama_kelas.toLowerCase().includes(searchQuery.toLowerCase()) || item.nama_guru.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesKelas = !filterValues.kelas || String(item.id_kelas) === filterValues.kelas;
        const matchesMapel = !filterValues.mapel || String(item.id_mapel) === filterValues.mapel;
        return matchesSearch && matchesKelas && matchesMapel;
    });

    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const maxVisible = 5;
        if (currentPage > 1) pages.push(<button key="prev-page" onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">«</button>);
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(<button key={`page-${i}`} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{i}</button>);
        } else {
            pages.push(<button key="page-1" onClick={() => setCurrentPage(1)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === 1 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>1</button>);
            if (currentPage > 3) pages.push(<span key="dots1" className="px-2 text-gray-600">...</span>);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(<button key={`page-${i}`} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{i}</button>);
            if (currentPage < totalPages - 2) pages.push(<span key="dots2" className="px-2 text-gray-600">...</span>);
            pages.push(<button key={`page-${totalPages}`} onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{totalPages}</button>);
        }
        if (currentPage < totalPages) pages.push(<button key="next-page" onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">»</button>);
        return pages;
    };

    const isFormValid = formData.user_id && formData.id_mapel && formData.id_kelas && formData.confirmData;

    const renderForm = (title: string, isEdit: boolean) => (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full max-w-2xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">{title}</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                        <button onClick={() => { setShowTambah(false); setShowEdit(false); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Guru Pengampu <span className="text-red-500">*</span></label>
                            <select name="user_id" value={formData.user_id} onChange={handleInputChange} className={`w-full border ${errors.user_id ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 ${focusClass}`} disabled={dropdownLoading}>
                                <option value="">-- Pilih --</option>
                                {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                            </select>
                            {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mata Pelajaran <span className="text-red-500">*</span></label>
                            <select name="id_mapel" value={formData.id_mapel} onChange={handleInputChange} className={`w-full border ${errors.id_mapel ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 ${focusClass}`} disabled={dropdownLoading}>
                                <option value="">-- Pilih --</option>
                                {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                            </select>
                            {errors.id_mapel && <p className="text-red-500 text-xs mt-1">{errors.id_mapel}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas <span className="text-red-500">*</span></label>
                            <select name="id_kelas" value={formData.id_kelas} onChange={handleInputChange} className={`w-full border ${errors.id_kelas ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 ${focusClass}`} disabled={dropdownLoading}>
                                <option value="">-- Pilih --</option>
                                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                            {errors.id_kelas && <p className="text-red-500 text-xs mt-1">{errors.id_kelas}</p>}
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" name="confirmData" checked={formData.confirmData} onChange={handleInputChange} className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                            <span className="text-sm text-gray-700">Saya yakin data yang diisi sudah benar</span>
                        </label>
                        {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
                    </div>
                    <div className="mt-6 sm:mt-8">
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button onClick={() => { setShowTambah(false); setShowEdit(false); }} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium">Batal</button>
                            <button onClick={() => setFormData({ user_id: '', id_mapel: '', id_kelas: '', confirmData: false })} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium">Reset</button>
                            <button onClick={() => handleSubmit(isEdit)} disabled={!isFormValid} className={`flex-1 py-2.5 rounded text-xs sm:text-sm font-medium ${!isFormValid ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>{isEdit ? 'Update' : 'Simpan'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (showTambah) return renderForm('Tambah Data Pembelajaran', false);
    if (showEdit) return renderForm('Edit Data Pembelajaran', true);

    return (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Pembelajaran</h1>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Ajaran</label>
                        <select value={selectedTahunAjaranId ?? ''} onChange={(e) => { const value = e.target.value; if (value === '') { setSelectedTahunAjaranId(null); setSelectedTahunAjaranAktif(false); setLoading(false); setDataList([]); return; } const id = Number(value); const selectedTa = tahunAjaranList.find((ta) => ta.id === id); setSelectedTahunAjaranId(id); setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false); setLoading(true); fetchData(id); }} className={`w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm ${focusClass}`}>
                            <option value="">-- Pilih Tahun Ajaran --</option>
                            {tahunAjaranList.map((ta) => { const semesterDisplay = ta.semester === 'ganjil' ? 'Ganjil' : 'Genap'; return (<option key={ta.id} value={ta.id}>{ta.tahun_ajaran} {semesterDisplay} {ta.is_aktif ? '(Aktif)' : ''}</option>); })}
                        </select>
                    </div>

                    {selectedTahunAjaranId === null ? (
                        <div className="mt-8 text-center py-8 bg-orange-50 border border-dashed border-orange-300 rounded-lg">
                            <p className="text-orange-800 text-lg font-medium">Pilih Tahun Ajaran Terlebih Dahulu.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div className="flex flex-wrap gap-2">
                                    {selectedTahunAjaranAktif && (
                                        <button onClick={() => setShowTambah(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"><Plus size={20} /> Tambah Pembelajaran</button>
                                    )}
                                    <button onClick={() => { if (dropdownLoading) { alert('Mohon tunggu, data dropdown masih dimuat.'); return; } setOpenedFilterValues({ ...filterValues }); setShowFilter(true); setFilterClosing(false); }} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"><Filter size={20} /> Filter Pembelajaran</button>
                                </div>
                                <div className="relative min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-gray-400" /></div>
                                    <input type="text" placeholder="pencarian" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className={`w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm ${focusClass}`} />
                                    {searchQuery && (<button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>)}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                <table className="w-full min-w-[600px] table-auto text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No.</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Mata Pelajaran</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Kelas</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Guru Pengampu</th>
                                            {selectedTahunAjaranAktif && (<th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Aksi</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                                        ) : currentData.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Tidak ada data pembelajaran</td></tr>
                                        ) : (
                                            currentData.map((item, index) => (
                                                <tr key={item.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                                    <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{item.nama_mapel}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{item.nama_kelas}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{item.nama_guru}</td>
                                                    {selectedTahunAjaranAktif && (
                                                        <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                            <div className="flex gap-1 justify-center">
                                                                <button onClick={() => { setEditId(item.id); setFormData({ user_id: String(item.user_id), id_mapel: String(item.id_mapel), id_kelas: String(item.id_kelas), confirmData: false }); setShowEdit(true); }} className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"><Pencil size={16} /><span className="hidden sm:inline">Edit</span></button>
                                                                <button onClick={() => handleDelete(item.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"><Trash2 size={16} /><span className="hidden sm:inline">Hapus</span></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredData.length > 0 && (
                                <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                                    <div className="text-sm text-gray-600">Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredData.length)} dari {filteredData.length} data</div>
                                    <div className="flex gap-1 flex-wrap justify-center">{renderPagination()}</div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Modal Filter */}
                    {showFilter && (
                        <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`} onClick={(e) => { if (e.target === e.currentTarget) { closeFilterModal(); } }}>
                            <div className="absolute inset-0 bg-gray-900/70"></div>
                            <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                                <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Filter Pembelajaran</h2>
                                    <button onClick={closeFilterModal} className="text-gray-500 hover:text-gray-700" aria-label="Tutup filter"><X size={20} /></button>
                                </div>
                                <div className="p-4 sm:p-6 space-y-4">
                                    {dropdownLoading ? (
                                        <div className="flex flex-col items-center justify-center py-6">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mb-3"></div>
                                            <p className="text-sm text-gray-500">Memuat data...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                                                <select value={filterValues.kelas} onChange={(e) => setFilterValues((prev) => ({ ...prev, kelas: e.target.value }))} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${focusClass}`}>
                                                    <option value="">Semua Kelas</option>
                                                    {kelasList.map((k) => <option key={k.id} value={String(k.id)}>{k.nama}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                                                <select value={filterValues.mapel} onChange={(e) => setFilterValues((prev) => ({ ...prev, mapel: e.target.value }))} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${focusClass}`}>
                                                    <option value="">Semua Mata Pelajaran</option>
                                                    {mapelList.map((m) => <option key={m.id} value={String(m.id)}>{m.nama}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button onClick={() => { setFilterValues({ kelas: '', mapel: '' }); setSearchQuery(''); setCurrentPage(1); }} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-100 transition text-sm">Reset</button>
                                                <button onClick={() => { setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); }} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition text-sm">Terapkan</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}