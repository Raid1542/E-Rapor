/**
 * Nama File: catatan_wali_kelas_client.tsx
 * Fungsi: Komponen client-side untuk mengelola catatan wali kelas dan keputusan
 *         naik tingkat siswa. Field "naik tingkat" hanya aktif dan wajib diisi
 *         saat jenis penilaian = PAS dan semester = Genap.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, ChangeEvent, ReactNode } from 'react';
import { Pencil, X, Search } from 'lucide-react';

interface SiswaCatatan {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
    jenis_kelamin: string;
    catatan_wali_kelas: string;
    naik_tingkat: 'ya' | 'tidak' | null;
}

export default function DataCatatanWaliKelasPage() {
    const [siswaList, setSiswaList] = useState<SiswaCatatan[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaCatatan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editData, setEditData] = useState<{
        catatan_wali_kelas: string;
        naik_tingkat: 'ya' | 'tidak' | null;
    }>({
        catatan_wali_kelas: '',
        naik_tingkat: null,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PAS');
    const [editClosing, setEditClosing] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [originalData, setOriginalData] = useState<{
        catatan_wali_kelas: string;
        naik_tingkat: 'ya' | 'tidak' | null;
    } | null>(null);

    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => {
            setShowEdit(false);
            setEditClosing(false);
            setEditId(null);
            setOriginalData(null);
        }, 200);
    };

    // Fetch periode aktif dan data catatan
    useEffect(() => {
        const loadData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }

            try {
                // Ambil tahun ajaran aktif
                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!taRes.ok) {
                    const err = await taRes.json();
                    alert(err.message || 'Gagal memuat periode aktif');
                    return;
                }

                const taData = await taRes.json();
                const { semester: sem, status_pts, status_pas } = taData.data;

                let jenis = 'PAS';
                if (status_pts === 'aktif') jenis = 'PTS';
                else if (status_pas === 'aktif') jenis = 'PAS';

                setSemester(sem as 'Ganjil' | 'Genap');
                setJenisPenilaian(jenis as 'PTS' | 'PAS');

                // Ambil data catatan berdasarkan periode
                await fetchCatatan(sem, jenis, token);
            } catch (err) {
                console.error('Error load catatan: ', err);
                alert('Gagal terhubung ke server');
            }
        };

        loadData();
    }, []);

    const fetchCatatan = async (sem: string, jenis: string, token: string) => {
        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/guru-kelas/catatan-wali-kelas/${jenis}/${sem}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setFilteredSiswa(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                } else {
                    alert(data.message || 'Gagal memuat data catatan wali kelas');
                }
            } else {
                const error = await res.json();
                alert(error.message || 'Gagal memuat data catatan wali kelas');
            }
        } catch (err) {
            console.error('Error fetch catatan:', err);
            alert('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    // Filter pencarian
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            const filtered = siswaList.filter(
                (s) =>
                    s.nama.toLowerCase().includes(q) ||
                    s.nis.includes(q) ||
                    s.nisn.includes(q)
            );
            setFilteredSiswa(filtered);
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    // Buka modal edit
    const handleEdit = (siswa: SiswaCatatan) => {
        const data = {
            catatan_wali_kelas: siswa.catatan_wali_kelas || '',
            naik_tingkat: siswa.naik_tingkat,
        };
        setEditId(siswa.id_siswa);
        setEditData(data);
        setOriginalData(data);
        setShowEdit(true);
    };

    // Simpan perubahan
    const handleSave = async () => {
        if (!editId || !originalData) return;

        const isPASGenap = jenisPenilaian === 'PAS' && semester === 'Genap';

        const hasChanges = isPASGenap
            ? editData.catatan_wali_kelas !== originalData.catatan_wali_kelas ||
            editData.naik_tingkat !== originalData.naik_tingkat
            : editData.catatan_wali_kelas !== originalData.catatan_wali_kelas;

        if (!hasChanges) {
            alert('Tidak ada perubahan yang dilakukan.');
            closeEdit();
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login habis.');
            return;
        }

        const payload: any = {
            catatan_wali_kelas: editData.catatan_wali_kelas,
        };

        if (isPASGenap) {
            if (editData.naik_tingkat !== 'ya' && editData.naik_tingkat !== 'tidak') {
                alert('Di PAS Semester Genap, keputusan naik tingkat wajib diisi.');
                return;
            }
            payload.naik_tingkat = editData.naik_tingkat;
        } else {
            // Untuk semua kasus lain (termasuk PTS Genap), kirim null
            payload.naik_tingkat = null;
        }

        try {
            const res = await fetch(
                `http://localhost:5000/api/guru-kelas/catatan-wali-kelas/${editId}/${jenisPenilaian}/${semester}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok) {
                alert('Catatan wali kelas berhasil disimpan');
                closeEdit();
                const updatedSiswa = siswaList.map((s) =>
                    s.id_siswa === editId ? { ...s, ...payload } : s
                );
                setSiswaList(updatedSiswa);
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal menyimpan catatan wali kelas');
            }
        } catch (err) {
            alert('Gagal terhubung ke server');
        }
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'catatan_wali_kelas') {
            // Selalu simpan sebagai string (jangan null)
            setEditData((prev) => ({
                ...prev,
                catatan_wali_kelas: value, // value dari textarea selalu string
            }));
        } else if (name === 'naik_tingkat') {
            // Untuk select, boleh null jika kosong
            setEditData((prev) => ({
                ...prev,
                naik_tingkat: value === '' ? null : (value as 'ya' | 'tidak'),
            }));
        }
    };

    // Pagination
    const totalPages = Math.ceil(filteredSiswa.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const maxVisible = 5;
        if (currentPage > 1)
            pages.push(
                <button
                    key="prev"
                    onClick={() => setCurrentPage((c) => c - 1)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                    «
                </button>
            );
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(
                    <button
                        key={`page-${i}`}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 border border-gray-300 rounded ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            }`}
                    >
                        {i}
                    </button>
                );
            }
        } else {
            pages.push(
                <button
                    key="page-1"
                    onClick={() => setCurrentPage(1)}
                    className={`px-3 py-1 border border-gray-300 rounded ${currentPage === 1 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                        }`}
                >
                    1
                </button>
            );
            if (currentPage > 3) pages.push(<span key="dots1" className="px-2 text-gray-600">...</span>);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(
                    <button
                        key={`page-${i}`}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 border border-gray-300 rounded ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                            }`}
                    >
                        {i}
                    </button>
                );
            }
            if (currentPage < totalPages - 2)
                pages.push(<span key="dots2" className="px-2 text-gray-600">...</span>);
            pages.push(
                <button
                    key={`page-${totalPages}`}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1 border border-gray-300 rounded ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                        }`}
                >
                    {totalPages}
                </button>
            );
        }
        if (currentPage < totalPages)
            pages.push(
                <button
                    key="next"
                    onClick={() => setCurrentPage((c) => c + 1)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                    »
                </button>
            );
        return pages;
    };

    return (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Catatan Wali Kelas</h1>

                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">Kelas: {kelasNama}</h2>
                            <p className="text-sm text-gray-600">
                                Periode: {jenisPenilaian} - Semester {semester}
                                <br />
                                {jenisPenilaian === 'PAS' && semester === 'Genap'
                                    ? 'Isi catatan dan keputusan naik tingkat.'
                                    : 'Isi catatan. Keputusan naik tingkat hanya di PAS Semester Genap.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
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
                            <div className="relative flex-1 min-w-[200px] sm:min-w-[240px] max-w-[400px]">
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
                                        onClick={() => {
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                        }}
                                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full min-w-[800px] table-auto text-sm">
                        <thead>
                            <tr>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">
                                    No.
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">
                                    Nama
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">
                                    NIS
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">
                                    NISN
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold min-w-[200px]">
                                    Catatan
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold min-w-[120px]">
                                    Naik Tingkat
                                </th>
                                <th className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold min-w-[80px]">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr key="loading">
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr key="empty">
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        {searchQuery ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa di kelas ini.'}
                                    </td>
                                </tr>
                            ) : (
                                currentSiswa.map((siswa, index) => (
                                    <tr
                                        key={siswa.id_siswa}
                                        className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                                    >
                                        <td className="px-3 py-3 text-center align-middle font-medium">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-3 py-3 text-center align-middle font-medium">{siswa.nama}</td>
                                        <td className="px-3 py-3 text-center align-middle">{siswa.nis}</td>
                                        <td className="px-3 py-3 text-center align-middle">{siswa.nisn}</td>
                                        <td className="px-3 py-3 text-center align-middle">
                                            <div className="truncate max-w-xs mx-auto">
                                                {siswa.catatan_wali_kelas || <span className="text-gray-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center align-middle">
                                            {jenisPenilaian === 'PAS' && semester === 'Genap' ? (
                                                siswa.naik_tingkat === 'ya' ? (
                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Ya</span>
                                                ) : siswa.naik_tingkat === 'tidak' ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Tidak</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center align-middle">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleEdit(siswa)}
                                                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm min-w-[64px]"
                                                >
                                                    <Pencil size={14} />
                                                    <span className="hidden sm:inline">Edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                    <div className="text-sm text-gray-600">
                        Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredSiswa.length)} dari{' '}
                        {filteredSiswa.length} data
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">{renderPagination()}</div>
                </div>
            </div>

            {showEdit && editId !== null && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'
                        } p-3 sm:p-4`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeEdit();
                    }}
                >
                    <div className="absolute inset-0 bg-gray-900/70"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Edit Catatan Wali Kelas</h2>
                            <button
                                onClick={closeEdit}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Tutup"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-gray-800">
                                    {siswaList.find((s) => s.id_siswa === editId)?.nama}
                                </h3>
                            </div>

                            {/* Form Catatan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Catatan Wali Kelas
                                </label>
                                <textarea
                                    name="catatan_wali_kelas"
                                    value={editData.catatan_wali_kelas}
                                    onChange={handleChange}
                                    placeholder="Contoh: Anak aktif, perlu bimbingan dalam..."
                                    rows={5}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            {/* Form Naik Tingkat: Hanya tampil jika PAS Genap */}
                            {jenisPenilaian === 'PAS' && semester === 'Genap' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Keputusan Naik Tingkat <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="naik_tingkat"
                                        value={editData.naik_tingkat || ''}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">Pilih keputusan</option>
                                        <option value="ya">Ya</option>
                                        <option value="tidak">Tidak</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                                    Keputusan naik tingkat hanya diisi pada periode{' '}
                                    <strong>PAS Semester Genap</strong>.
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={closeEdit}
                                    className="px-4 sm:px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 sm:px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition text-sm font-medium"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}