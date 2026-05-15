/**
 * Nama File: data_mata_pelajaran_client.tsx
 * Fungsi: Komponen utama halaman Data Mata Pelajaran untuk admin.
 *         Menyediakan fitur CRUD (Create, Read, Update, Delete) mata pelajaran
 *         berdasarkan tahun ajaran aktif atau non-aktif, termasuk pencarian,
 *         paginasi, dan input urutan rapor hanya saat edit.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';
import { useState, useEffect, useRef, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2 } from 'lucide-react';

interface MataPelajaran {
    id: number;
    kode_mapel: string;
    nama_mapel: string;
    jenis: string;
    kurikulum: string;
    tahun_ajaran_id: number;
    tahun_ajaran: string;
    semester: string;
    urutan_rapor: number | null;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_aktif: boolean;
}

interface FormDataType {
    kode_mapel: string;
    nama_mapel: string;
    jenis: string;
    kurikulum: string;
    urutan_rapor: string;
    confirmData: boolean;
}

export default function DataMataPelajaranPage() {
    const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
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

    const [formData, setFormData] = useState<FormDataType>({
        kode_mapel: '',
        nama_mapel: '',
        jenis: '',
        kurikulum: '',
        urutan_rapor: '',
        confirmData: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const initialFormDataRef = useRef<FormDataType | null>(null);

    // === Fetch Tahun Ajaran ===
    const fetchTahunAjaran = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }
            const res = await fetch("http://localhost:5000/api/admin/tahun-ajaran", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const options = data.data.map((ta: any) => ({
                    id: ta.id_tahun_ajaran,
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: (ta.semester || 'ganjil').toLowerCase(),
                    is_aktif: ta.status === 'aktif'
                }));
                setTahunAjaranList(options);
            }
        } catch (err) {
            console.error('Gagal ambil tahun ajaran:', err);
            alert('Gagal terhubung ke server');
        }
    };

    // === Fetch Data Mata Pelajaran ===
    const fetchMataPelajaran = async (tahunAjaranId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }
            const res = await fetch(`http://localhost:5000/api/admin/mata-pelajaran?tahun_ajaran_id=${tahunAjaranId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                const camelCasedData = (Array.isArray(data.data) ? data.data : []).map((mp: any) => ({
                    id: mp.id_mata_pelajaran,
                    kode_mapel: mp.kode_mapel,
                    nama_mapel: mp.nama_mapel,
                    jenis: mp.jenis,
                    kurikulum: mp.kurikulum,
                    tahun_ajaran_id: mp.tahun_ajaran_id,
                    tahun_ajaran: mp.tahun_ajaran,
                    semester: mp.semester,
                    urutan_rapor: mp.urutan_rapor
                }));
                setMapelList(camelCasedData);
            } else {
                alert('Gagal memuat data mata pelajaran: ' + (data.message || 'Tidak terotorisasi'));
            }
        } catch (err) {
            console.error('Error fetch mata pelajaran:', err);
            alert('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTahunAjaran();
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'jenis') {
            setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
        } else if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        const kodeMapel = formData.kode_mapel?.trim() || '';
        const namaMapel = formData.nama_mapel?.trim() || '';
        const kurikulum = formData.kurikulum?.trim() || '';
        const jenis = formData.jenis?.toLowerCase().trim() || '';

        if (!kodeMapel) newErrors.kode_mapel = 'Kode mapel wajib diisi';
        if (!namaMapel) newErrors.nama_mapel = 'Nama mapel wajib diisi';
        if (!kurikulum) newErrors.kurikulum = 'Kurikulum wajib diisi';

        if (!jenis) {
            newErrors.jenis = 'Jenis mapel wajib dipilih';
        } else if (!['wajib', 'pilihan'].includes(jenis)) {
            newErrors.jenis = `Jenis tidak valid: "${jenis}". Harus "wajib" atau "pilihan"`;
        }

        if (!formData.confirmData) {
            newErrors.confirmData = 'Harap konfirmasi data terlebih dahulu';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitTambah = async () => {
        if (!validate()) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login telah habis. Silakan login ulang.');
            return;
        }
        if (!selectedTahunAjaranId) {
            alert('Tahun ajaran aktif belum dipilih.');
            return;
        }
        try {
            const payload = {
                kode_mapel: formData.kode_mapel.trim().toUpperCase(),
                nama_mapel: formData.nama_mapel.trim(),
                jenis: formData.jenis.trim(),
                kurikulum: formData.kurikulum.trim(),
                tahun_ajaran_id: selectedTahunAjaranId
            };
            const res = await fetch("http://localhost:5000/api/admin/mata-pelajaran", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Mata pelajaran berhasil ditambahkan");
                setShowTambah(false);
                fetchMataPelajaran(selectedTahunAjaranId);
                handleReset();
            } else {
                const error = await res.json();
                alert(error.message || "Gagal menambah mata pelajaran");
            }
        } catch (err) {
            alert("Gagal terhubung ke server");
        }
    };

    const handleEdit = (mapel: MataPelajaran) => {
        const initialData: FormDataType = {
            kode_mapel: mapel.kode_mapel,
            nama_mapel: mapel.nama_mapel,
            jenis: mapel.jenis.toLowerCase(),
            kurikulum: mapel.kurikulum,
            urutan_rapor: mapel.urutan_rapor !== null ? String(mapel.urutan_rapor) : '',
            confirmData: false
        };
        setEditId(mapel.id);
        setFormData(initialData);
        initialFormDataRef.current = { ...initialData };
        setShowEdit(true);
    };

    const handleSubmitEdit = async () => {
        const initial = initialFormDataRef.current;
        const hasChanges =
            formData.kode_mapel !== initial?.kode_mapel ||
            formData.nama_mapel !== initial?.nama_mapel ||
            formData.jenis !== initial?.jenis ||
            formData.kurikulum !== initial?.kurikulum ||
            formData.urutan_rapor !== initial?.urutan_rapor;

        if (!hasChanges) {
            alert('Tidak ada perubahan data.');
            return;
        }

        if (!validate()) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login telah habis. Silakan login ulang.');
            return;
        }
        if (!editId) return;

        try {
            const urutanRaporInput = formData.urutan_rapor.trim() || '';
            const urutan_rapor = urutanRaporInput ? Number(urutanRaporInput) : null;

            const payload = {
                kode_mapel: formData.kode_mapel.trim().toUpperCase(),
                nama_mapel: formData.nama_mapel.trim(),
                jenis: formData.jenis.trim(),
                kurikulum: formData.kurikulum.trim(),
                urutan_rapor
            };

            const res = await fetch(`http://localhost:5000/api/admin/mata-pelajaran/${editId}`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Data mata pelajaran berhasil diperbarui");
                setShowEdit(false);
                setEditId(null);
                if (selectedTahunAjaranId) fetchMataPelajaran(selectedTahunAjaranId);
                handleReset();
            } else {
                const error = await res.json();
                alert('Error: ' + (error.message || 'Gagal memperbarui'));
            }
        } catch (err) {
            alert("Gagal terhubung ke server");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login telah habis.');
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/mata-pelajaran/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Mata pelajaran berhasil dihapus');
                if (selectedTahunAjaranId) fetchMataPelajaran(selectedTahunAjaranId);
            } else {
                const error = await res.json();
                alert(error.message || 'Gagal menghapus mata pelajaran');
            }
        } catch (err) {
            alert('Gagal terhubung ke server');
        }
    };

    const handleReset = () => {
        setFormData({
            kode_mapel: '',
            nama_mapel: '',
            jenis: '',
            kurikulum: '',
            urutan_rapor: '',
            confirmData: false
        });
        setErrors({});
    };

    // === Filtering & Pagination ===
    const filteredMapel = mapelList.filter((mp) => {
        const query = searchQuery.toLowerCase().trim();
        return !query ||
            mp.kode_mapel.toLowerCase().includes(query) ||
            mp.nama_mapel.toLowerCase().includes(query) ||
            mp.jenis.toLowerCase().includes(query) ||
            mp.kurikulum.toLowerCase().includes(query);
    });

    const totalPages = Math.max(1, Math.ceil(filteredMapel.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMapel = filteredMapel.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const maxVisible = 5;
        if (currentPage > 1) {
            pages.push(<button key="prev" onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">«</button>);
        }
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
            }
        } else {
            pages.push(<button key={1} onClick={() => setCurrentPage(1)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === 1 ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>1</button>);
            if (currentPage > 3) pages.push(<span key="dots1" className="px-2 text-gray-600">...</span>);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
            }
            if (currentPage < totalPages - 2) pages.push(<span key="dots2" className="px-2 text-gray-600">...</span>);
            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1 border border-gray-300 rounded transition ${currentPage === totalPages ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{totalPages}</button>);
        }
        if (currentPage < totalPages) {
            pages.push(<button key="next" onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">»</button>);
        }
        return pages;
    };

    // === Render Form Tambah/Edit ===
    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full max-w-2xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Data Mata Pelajaran</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {isEdit ? 'Edit Data Mata Pelajaran' : 'Tambah Data Mata Pelajaran'}
                        </h2>
                        <button
                            onClick={() => {
                                isEdit ? setShowEdit(false) : setShowTambah(false);
                                handleReset();
                            }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kode Mapel <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="kode_mapel"
                                value={formData.kode_mapel}
                                onChange={handleInputChange}
                                placeholder="Contoh: MAT, BINDO"
                                className={`w-full border ${errors.kode_mapel ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.kode_mapel && <p className="text-red-500 text-xs mt-1">{errors.kode_mapel}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nama Mata Pelajaran <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nama_mapel"
                                value={formData.nama_mapel}
                                onChange={handleInputChange}
                                placeholder="Contoh: Matematika Wajib"
                                className={`w-full border ${errors.nama_mapel ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.nama_mapel && <p className="text-red-500 text-xs mt-1">{errors.nama_mapel}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Jenis <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="jenis"
                                value={formData.jenis}
                                onChange={handleInputChange}
                                className={`w-full border ${errors.jenis ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            >
                                <option value="">-- Pilih --</option>
                                <option value="wajib">Wajib</option>
                                <option value="pilihan">Pilihan</option>
                            </select>
                            {errors.jenis && <p className="text-red-500 text-xs mt-1">{errors.jenis}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kurikulum <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="kurikulum"
                                value={formData.kurikulum}
                                onChange={handleInputChange}
                                placeholder="Contoh: Kurikulum Merdeka"
                                className={`w-full border ${errors.kurikulum ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            />
                            {errors.kurikulum && <p className="text-red-500 text-xs mt-1">{errors.kurikulum}</p>}
                        </div>

                        {/* Input Urutan Rapor (HANYA di form EDIT) */}
                        {isEdit && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Urutan di Rapor (kosongkan = tampil di akhir)
                                </label>
                                <input
                                    type="number"
                                    name="urutan_rapor"
                                    value={formData.urutan_rapor}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: 1, 2, 3..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="1"
                                />
                            </div>
                        )}
                    </div>
                    <div className="mt-6">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="confirmData"
                                checked={formData.confirmData}
                                onChange={handleInputChange}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                                Saya yakin data yang diisi sudah benar
                            </span>
                        </label>
                        {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
                    </div>
                    <div className="mt-6 sm:mt-8">
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <button
                                onClick={() => {
                                    isEdit ? setShowEdit(false) : setShowTambah(false);
                                    handleReset();
                                }}
                                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleReset}
                                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium"
                            >
                                Reset
                            </button>
                            <button
                                onClick={isEdit ? handleSubmitEdit : handleSubmitTambah}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium"
                            >
                                {isEdit ? 'Update' : 'Simpan'}
                            </button>
                        </div>
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
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Mata Pelajaran</h1>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    {/* Dropdown Tahun Ajaran */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tahun Ajaran
                        </label>
                        <select
                            value={selectedTahunAjaranId ?? ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                    setSelectedTahunAjaranId(null);
                                    setSelectedTahunAjaranAktif(false);
                                    setLoading(false);
                                    setMapelList([]);
                                    return;
                                }
                                const id = Number(value);
                                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                                setSelectedTahunAjaranId(id);
                                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                                setLoading(true);
                                fetchMataPelajaran(id);
                            }}
                            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Pilih Tahun Ajaran --</option>
                            {tahunAjaranList.map(ta => {
                                const semesterDisplay = ta.semester === 'ganjil' ? 'Ganjil' : 'Genap';
                                return (
                                    <option key={ta.id} value={ta.id}>
                                        {ta.tahun_ajaran} {semesterDisplay} {ta.is_aktif ? "(Aktif)" : ""}
                                    </option>
                                );
                            })}
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
                                        <button
                                            onClick={() => setShowTambah(true)}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"
                                        >
                                            <Plus size={20} />
                                            Tambah Mapel
                                        </button>
                                    )}
                                </div>
                                <div className="relative min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="pencarian"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                            className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                <table className="w-full min-w-[600px] table-auto text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No.</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Kode</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Mata Pelajaran</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Jenis</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Kurikulum</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Urutan Rapor</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                                            </tr>
                                        ) : currentMapel.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data mata pelajaran</td>
                                            </tr>
                                        ) : (
                                            currentMapel.map((mp, index) => (
                                                <tr key={mp.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                                    <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                                                    <td className="px-4 py-3 text-center align-middle font-medium">{mp.kode_mapel}</td>
                                                    <td className="px-4 py-3 align-middle">{mp.nama_mapel}</td>
                                                    <td className="px-4 py-3 text-center align-middle">
                                                        {mp.jenis.charAt(0).toUpperCase() + mp.jenis.slice(1)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-middle">{mp.kurikulum}</td>
                                                    <td className="px-4 py-3 text-center align-middle">
                                                        {mp.urutan_rapor !== null ? mp.urutan_rapor : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                        {selectedTahunAjaranAktif ? (
                                                            <div className="flex gap-1 justify-center">
                                                                <button
                                                                    onClick={() => handleEdit(mp)}
                                                                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"
                                                                >
                                                                    <Pencil size={16} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(mp.id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    Hapus
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredMapel.length > 0 && (
                                <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                                    <div className="text-sm text-gray-600">
                                        Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredMapel.length)} dari {filteredMapel.length} data
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-center">
                                        {renderPagination()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}