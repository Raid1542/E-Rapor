/**
 * Nama File: data_siswa_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data siswa oleh admin.
 *         Menyediakan fitur CRUD (Create, Read, Update, Delete), filter berdasarkan
 *         kelas, jenis kelamin, dan status, serta import data siswa via Excel.
 *         Hanya tahun ajaran aktif yang memungkinkan aksi edit, hapus, tambah, dan import.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401022 
 * Tanggal: 15 September 2025
 */

'use client';
import { useState, useEffect, ChangeEvent, ReactNode } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search, Filter } from 'lucide-react';

interface Siswa {
    id: number;
    nama: string;
    kelas: string;
    nis: string;
    nisn: string;
    tempatLahir?: string;
    tanggalLahir?: string;
    jenisKelamin: string;
    alamat?: string;
    fase: string;
    statusSiswa: string;
}

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_aktif: boolean;
}

interface Kelas {
    id: number;
    nama: string;
    fase: string;
}

interface FormDataType {
    nama: string;
    kelas: string;
    nis: string;
    nisn: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    alamat: string;
    fase: string;
    statusSiswa: string;
    confirmData: boolean;
}

export default function DataSiswaPage() {

    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importClosing, setImportClosing] = useState(false);
    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
    const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);
    const [kelasList, setKelasList] = useState<{ id: number; nama: string; fase: string }[]>([]);
    const [kelasLoading, setKelasLoading] = useState(true);

    // === Helper: Format Tanggal Indonesia ===
    const formatTanggalIndo = (dateString: string | null): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // === Filter Modal ===
    const [showFilter, setShowFilter] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [filterValues, setFilterValues] = useState({
        kelas: '',
        jenisKelamin: '',
        status: ''
    });
    const [openedFilterValues, setOpenedFilterValues] = useState({
        kelas: '',
        jenisKelamin: '',
        status: ''
    });
    const resetFilter = () => {
        setFilterValues({ kelas: '', jenisKelamin: '', status: '' });
        setSearchQuery('');
        setCurrentPage(1);
    };
    const closeFilterModal = () => {
        setFilterClosing(true);
        setTimeout(() => {
            setFilterValues(openedFilterValues);
            setShowFilter(false);
            setFilterClosing(false);
        }, 200);
    };

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

    // ✅ BARU: Fetch daftar kelas dari API
    const fetchKelasDropdown = async () => {
        setKelasLoading(true); // ✅ Mulai loading
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setKelasLoading(false);
                return;
            }
            const res = await fetch("http://localhost:5000/api/admin/dropdown", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setKelasList(data.data);
            }
        } catch (err) {
            console.error('Error fetch kelas dropdown:', err);
        } finally {
            setKelasLoading(false); // ✅ Selesai loading
        }
    };

    // Panggil di useEffect
    useEffect(() => {
        fetchTahunAjaran();
        fetchKelasDropdown(); // ✅ Tambahkan ini
    }, []);

    // === Fetch Data Siswa ===
    const fetchSiswa = async (tahunAjaranId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }
            const res = await fetch(`http://localhost:5000/api/admin/siswa?tahun_ajaran_id=${tahunAjaranId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                const camelCasedData = (Array.isArray(data.data) ? data.data : []).map((siswa: any) => ({
                    id: siswa.id,
                    nama: siswa.nama,
                    kelas: siswa.kelas,
                    nis: siswa.nis,
                    nisn: siswa.nisn,
                    tempatLahir: siswa.tempat_lahir,
                    tanggalLahir: siswa.tanggal_lahir,
                    jenisKelamin: siswa.jenis_kelamin,
                    alamat: siswa.alamat,
                    fase: siswa.fase,
                    statusSiswa: siswa.status
                }));
                setSiswaList(camelCasedData);
            } else {
                alert('Gagal memuat data siswa: ' + (data.message || 'Tidak terotorisasi'));
            }
        } catch (err) {
            console.error('Error fetch siswa:', err);
            alert('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    // === Form & Validation ===
    const [formData, setFormData] = useState<FormDataType>({
        nama: '',
        kelas: '',
        nis: '',
        nisn: '',
        tempatLahir: '',
        tanggalLahir: '',
        jenisKelamin: '',
        alamat: '',
        fase: '',
        statusSiswa: 'aktif',
        confirmData: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleDetail = (siswa: Siswa) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    const handleEdit = (siswa: Siswa) => {
        setEditId(siswa.id);
        // ✅ Cari kelas_id berdasarkan nama_kelas
        const kelasItem = kelasList.find(k => k.nama === siswa.kelas);
        setFormData({
            nama: siswa.nama,
            kelas: kelasItem ? String(kelasItem.id) : '',
            nis: siswa.nis,
            nisn: siswa.nisn,
            tempatLahir: siswa.tempatLahir || '',
            tanggalLahir: siswa.tanggalLahir || '',
            jenisKelamin: siswa.jenisKelamin,
            alamat: siswa.alamat || '',
            fase: kelasItem?.fase || siswa.fase || '',
            statusSiswa: siswa.statusSiswa || 'aktif',
            confirmData: false
        });
        setShowEdit(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'kelas') {
            // ✅ Ambil fase dari kelasList berdasarkan ID
            const selectedKelas = kelasList.find(k => k.id === Number(value));
            setFormData(prev => ({ ...prev, fase: selectedKelas?.fase || '' }));
        }
    };

    const validate = (isEdit: boolean): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nama?.trim()) newErrors.nama = 'Nama wajib diisi';
        if (!formData.kelas) newErrors.kelas = 'Pilih kelas';
        if (!kelasList.some(k => k.id === Number(formData.kelas))) {
            newErrors.kelas = 'Kelas tidak valid';
        }
        if (!formData.nis) newErrors.nis = 'NIS wajib diisi';
        if (!formData.nisn) newErrors.nisn = 'NISN wajib diisi';
        if (!formData.jenisKelamin) newErrors.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.confirmData) newErrors.confirmData = 'Harap konfirmasi data';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitTambah = async () => {
        if (!validate(false)) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login telah habis. Silakan login ulang.');
            return;
        }
        try {
            const res = await fetch("http://localhost:5000/api/admin/siswa", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn,
                    nama_lengkap: formData.nama,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    kelas_id: Number(formData.kelas),
                    tahun_ajaran_id: selectedTahunAjaranId,
                })
            });
            if (res.ok) {
                alert("Data siswa berhasil ditambahkan");
                setShowTambah(false);
                if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
                handleReset();
            } else {
                const error = await res.json();
                alert(error.message || "Gagal menambah data siswa");
            }
        } catch (err) {
            alert("Gagal terhubung ke server");
        }
    };

    const handleSubmitEdit = async () => {
        const originalData = siswaList.find(s => s.id === editId);
        if (!originalData) return;
        const hasChanged =
            formData.nama !== originalData.nama ||
            formData.kelas !== String(kelasList.find(k => k.nama === originalData.kelas)?.id || '') ||
            formData.nis !== originalData.nis ||
            formData.nisn !== originalData.nisn ||
            formData.tempatLahir !== (originalData.tempatLahir || '') ||
            formData.tanggalLahir !== (originalData.tanggalLahir || '') ||
            formData.jenisKelamin !== originalData.jenisKelamin ||
            formData.alamat !== (originalData.alamat || '') ||
            formData.statusSiswa !== (originalData.statusSiswa || 'aktif');
        if (!hasChanged) {
            alert("Tidak ada perubahan data.");
            return;
        }
        if (!validate(true)) return;
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login telah habis. Silakan login ulang.');
            return;
        }
        if (selectedTahunAjaranId === null) {
            alert('Terjadi kesalahan: Tahun ajaran tidak dipilih.');
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/siswa/${editId}`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nis: formData.nis,
                    nisn: formData.nisn,
                    nama_lengkap: formData.nama,
                    tempat_lahir: formData.tempatLahir,
                    tanggal_lahir: formData.tanggalLahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    kelas_id: Number(formData.kelas),
                    status: formData.statusSiswa,
                    tahun_ajaran_id: selectedTahunAjaranId,
                })
            });
            if (res.ok) {
                alert("Data siswa berhasil diperbarui");
                setShowEdit(false);
                setEditId(null);
                if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
                handleReset();
            } else {
                const error = await res.json();
                alert(error.message || "Gagal memperbarui data siswa");
            }
        } catch (err) {
            alert("Gagal terhubung ke server");
        }
    };

    const handleReset = () => {
        setFormData({
            nama: '',
            kelas: '',
            nis: '',
            nisn: '',
            tempatLahir: '',
            tanggalLahir: '',
            jenisKelamin: '',
            alamat: '',
            fase: '',
            statusSiswa: 'aktif',
            confirmData: false
        });
        setErrors({});
    };

    const handleImportExcel = async () => {
        if (!importFile) {
            alert('Silakan pilih file Excel terlebih dahulu');
            return;
        }
        const formDataExcel = new FormData();
        formDataExcel.append('file', importFile);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/siswa/import', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataExcel
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Berhasil import ${result.total} data siswa!`);
                setShowImport(false);
                setImportFile(null);
                if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
            } else {
                alert('Gagal: ' + (result.message || 'Gagal import data siswa'));
            }
        } catch (err) {
            console.error('Import error:', err);
            alert('Gagal terhubung ke server');
        }
    };

    // === Filtering & Pagination ===
    const filteredSiswa = siswaList.filter((siswa) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query ||
            siswa.nama.toLowerCase().includes(query) ||
            siswa.nis.includes(query) ||
            siswa.nisn.includes(query) ||
            siswa.kelas.toLowerCase().includes(query) ||
            (siswa.alamat && siswa.alamat.toLowerCase().includes(query));
        const matchesKelas = !filterValues.kelas || siswa.kelas === filterValues.kelas;
        const matchesJenisKelamin = !filterValues.jenisKelamin || siswa.jenisKelamin === filterValues.jenisKelamin;
        const matchesStatus = !filterValues.status || siswa.statusSiswa === filterValues.status;
        return matchesSearch && matchesKelas && matchesJenisKelamin && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

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
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Data Siswa</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {isEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nama <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nama"
                                value={formData.nama}
                                onChange={handleInputChange}
                                placeholder="Masukkan nama lengkap"
                                className={`w-full border ${errors.nama ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                            />
                            {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Kelas <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="kelas"
                                value={formData.kelas}
                                onChange={handleInputChange}
                                className={`w-full border ${errors.kelas ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                            >
                                <option value="">-- Pilih --</option>
                                {kelasList.map(kls => (
                                    <option key={kls.id} value={kls.id}>{kls.nama}</option>
                                ))}
                            </select>
                            {errors.kelas && <p className="text-red-500 text-xs mt-1">{errors.kelas}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                NIS <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nis"
                                value={formData.nis}
                                onChange={handleInputChange}
                                placeholder="NIS"
                                className={`w-full border ${errors.nis ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                            />
                            {errors.nis && <p className="text-red-500 text-xs mt-1">{errors.nis}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                NISN <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nisn"
                                value={formData.nisn}
                                onChange={handleInputChange}
                                placeholder="NISN"
                                className={`w-full border ${errors.nisn ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                            />
                            {errors.nisn && <p className="text-red-500 text-xs mt-1">{errors.nisn}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempat Lahir</label>
                            <input
                                type="text"
                                name="tempatLahir"
                                value={formData.tempatLahir}
                                onChange={handleInputChange}
                                placeholder="Tempat Lahir"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
                            <input
                                type="date"
                                name="tanggalLahir"
                                value={formData.tanggalLahir}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded px-4 py-2.5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Jenis Kelamin <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="jenisKelamin"
                                value={formData.jenisKelamin}
                                onChange={handleInputChange}
                                className={`w-full border ${errors.jenisKelamin ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                            >
                                <option value="">-- Pilih --</option>
                                <option value="LAKI-LAKI">Laki-laki</option>
                                <option value="PEREMPUAN">Perempuan</option>
                            </select>
                            {errors.jenisKelamin && <p className="text-red-500 text-xs mt-1">{errors.jenisKelamin}</p>}
                        </div>
                        {isEdit && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Status Siswa <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="statusSiswa"
                                    value={formData.statusSiswa || 'aktif'}
                                    onChange={handleInputChange}
                                    className={`w-full border ${errors.statusSiswa ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                                >
                                    <option value="aktif">Aktif</option>
                                    <option value="lulus">Lulus</option>
                                    <option value="pindah">Pindah</option>
                                    <option value="drop-out">Drop-out</option>
                                </select>
                                {errors.statusSiswa && <p className="text-red-500 text-xs mt-1">{errors.statusSiswa}</p>}
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                            <textarea
                                name="alamat"
                                value={formData.alamat}
                                onChange={handleInputChange}
                                placeholder="Masukkan alamat lengkap"
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="confirmData"
                                checked={formData.confirmData}
                                onChange={handleInputChange}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded"
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

    if ((showTambah || showEdit) && kelasLoading) {
        return <div className="flex-1 p-6">loading kelas...</div>
    }
    if (showTambah) return renderForm(false);
    if (showEdit && kelasList.length > 0) return renderForm(true);

    return (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Siswa</h1>
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
                                    return;
                                }
                                const id = Number(value);
                                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                                setSelectedTahunAjaranId(id);
                                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                                setLoading(true);
                                fetchSiswa(id);
                            }}
                            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-0"
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
                                            Tambah Siswa
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="text-gray-700 text-sm">Tampilkan</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="border border-gray-300 rounded px-3 py-1 text-sm"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                        <span className="text-gray-700 text-sm">data</span>
                                    </div>
                                    <div className="relative min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Search className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Pencarian"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm"
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
                                    {selectedTahunAjaranAktif && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setOpenedFilterValues({ ...filterValues });
                                                    setShowFilter(true);
                                                    setFilterClosing(false);
                                                }}
                                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"
                                            >
                                                <Filter size={20} />
                                                Filter Siswa
                                            </button>
                                            <button
                                                onClick={() => setShowImport(true)}
                                                className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap"
                                            >
                                                <Upload size={20} />
                                                Import Siswa
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                <table className="w-full min-w-[600px] table-auto text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No.</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Nama</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Kelas</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">NIS</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">NISN</th>
                                            <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Status</th>
                                            {selectedTahunAjaranAktif ? (
                                                <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Aksi</th>
                                            ) : (
                                                <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Detail</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                                            </tr>
                                        ) : currentSiswa.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data siswa</td>
                                            </tr>
                                        ) : (
                                            currentSiswa.map((siswa, index) => (
                                                <tr key={siswa.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                                    <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                                                    <td className="px-4 py-3 align-middle font-medium">{siswa.nama}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{siswa.kelas}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{siswa.nis}</td>
                                                    <td className="px-4 py-3 text-center align-middle">{siswa.nisn}</td>
                                                    <td className="px-4 py-3 text-center align-middle">
                                                        {(() => {
                                                            const status = (siswa.statusSiswa || 'aktif').toLowerCase();
                                                            let bgColor = 'bg-red-100 text-red-700';
                                                            if (status === 'aktif') bgColor = 'bg-green-100 text-green-700';
                                                            else if (status === 'lulus') bgColor = 'bg-blue-100 text-blue-700';
                                                            else if (status === 'pindah') bgColor = 'bg-yellow-100 text-yellow-700';
                                                            return (
                                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${bgColor}`}>
                                                                    {siswa.statusSiswa?.toUpperCase() || 'AKTIF'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                        <div className="flex justify-center gap-1 sm:gap-2">
                                                            <button
                                                                onClick={() => handleDetail(siswa)}
                                                                className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"
                                                            >
                                                                <Eye size={16} />
                                                                <span className="hidden sm:inline">Detail</span>
                                                            </button>
                                                            {selectedTahunAjaranAktif && (
                                                                <button
                                                                    onClick={() => handleEdit(siswa)}
                                                                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 transition text-xs sm:text-sm"
                                                                >
                                                                    <Pencil size={16} />
                                                                    <span className="hidden sm:inline">Edit</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredSiswa.length > 0 && (
                                <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                                    <div className="text-sm text-gray-600">
                                        Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
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

            {/* Modal Detail */}
            {showDetail && selectedSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDetailClosing(true);
                            setTimeout(() => {
                                setShowDetail(false);
                                setDetailClosing(false);
                            }, 200);
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-gray-900/70"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detail Siswa</h2>
                            <button
                                onClick={() => {
                                    setDetailClosing(true);
                                    setTimeout(() => {
                                        setShowDetail(false);
                                        setDetailClosing(false);
                                    }, 200);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col items-center mb-10">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 text-center break-words">{selectedSiswa.nama}</h3>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm col-span-1 sm:col-span-1">Status</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <div className="col-span-1 sm:col-span-2">
                                        {(() => {
                                            const status = (selectedSiswa.statusSiswa || 'aktif').toLowerCase();
                                            let bgColor = 'bg-red-500 text-white';
                                            if (status === 'aktif') bgColor = 'bg-green-500 text-white';
                                            else if (status === 'lulus') bgColor = 'bg-blue-500 text-white';
                                            else if (status === 'pindah') bgColor = 'bg-yellow-500 text-white';
                                            return (
                                                <span className={`inline-block px-3 py-1 rounded text-xs sm:text-sm font-medium ${bgColor}`}>
                                                    {selectedSiswa.statusSiswa?.toUpperCase() || 'AKTIF'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Kelas</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.kelas}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">NIS</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.nis}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">NISN</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.nisn}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Tempat Lahir</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.tempatLahir || '-'}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Tanggal Lahir</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{formatTanggalIndo(selectedSiswa.tanggalLahir)}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Jenis Kelamin</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.jenisKelamin}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Alamat</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2">{selectedSiswa.alamat || '-'}</span>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                                    <span className="font-semibold text-xs sm:text-sm">Fase</span>
                                    <span className="text-xs sm:text-sm">:</span>
                                    <span className="text-xs sm:text-sm col-span-2"> {selectedSiswa.fase}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                <button
                                    onClick={() => {
                                        setDetailClosing(true);
                                        setTimeout(() => {
                                            setShowDetail(false);
                                            setDetailClosing(false);
                                        }, 200);
                                    }}
                                    className="px-4 sm:px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-xs sm:text-sm font-medium"
                                >
                                    Tutup
                                </button>
                                {selectedTahunAjaranAktif && (
                                    <button
                                        onClick={() => {
                                            handleEdit(selectedSiswa);
                                            setDetailClosing(true);
                                            setTimeout(() => {
                                                setShowDetail(false);
                                                setDetailClosing(false);
                                            }, 200);
                                        }}
                                        className="px-4 sm:px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded transition text-xs sm:text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Import */}
            {showImport && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setImportClosing(true);
                            setTimeout(() => {
                                setShowImport(false);
                                setImportClosing(false);
                            }, 200);
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-gray-900/70"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Import Data Siswa</h2>
                            <button
                                onClick={() => {
                                    setImportClosing(true);
                                    setTimeout(() => {
                                        setShowImport(false);
                                        setImportClosing(false);
                                    }, 200);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Tutup modal"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
                            </p>
                            <div className="mb-4">
                                <a
                                    href="http://localhost:5000/templates/template_import_siswa.xlsx"
                                    download
                                    className="text-blue-500 text-sm hover:underline flex items-center gap-1"
                                >
                                    📥 Unduh template Excel
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                    Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong>
                                </p>
                            </div>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600">
                                        {importFile ? (
                                            <span className="font-medium text-blue-600">{importFile.name}</span>
                                        ) : (
                                            'Klik untuk pilih file'
                                        )}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </label>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleImportExcel}
                                    disabled={!importFile}
                                    className={`flex-1 py-2.5 rounded-lg font-medium transition ${!importFile ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                >
                                    Import
                                </button>
                                <button
                                    onClick={() => {
                                        setImportClosing(true);
                                        setTimeout(() => {
                                            setShowImport(false);
                                            setImportClosing(false);
                                        }, 200);
                                    }}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Filter */}
            {showFilter && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            closeFilterModal();
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-gray-900/70"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Filter Siswa</h2>
                            <button
                                onClick={closeFilterModal}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Tutup filter"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Kelas <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="kelas"
                                    value={filterValues.kelas}
                                    onChange={(e) => setFilterValues(prev => ({ ...prev, kelas: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Semua Kelas</option>
                                    {kelasList.map(kls => (
                                        <option key={kls.id} value={kls.nama}>Kelas {kls.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                                <select
                                    value={filterValues.jenisKelamin}
                                    onChange={(e) => setFilterValues(prev => ({ ...prev, jenisKelamin: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Semua Jenis Kelamin</option>
                                    <option value="LAKI-LAKI">Laki-laki</option>
                                    <option value="PEREMPUAN">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filterValues.status}
                                    onChange={(e) => setFilterValues(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="aktif">Aktif</option>
                                    <option value="lulus">Lulus</option>
                                    <option value="pindah">Pindah</option>
                                    <option value="drop-out">Drop-out</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={resetFilter}
                                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-100 transition text-sm"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setFilterClosing(true);
                                        setTimeout(() => {
                                            setShowFilter(false);
                                            setFilterClosing(false);
                                        }, 200);
                                    }}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition text-sm"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}