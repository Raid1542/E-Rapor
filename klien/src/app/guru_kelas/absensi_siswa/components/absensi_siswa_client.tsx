/**
 * Nama File: absensi_siswa_client.tsx
 * Fungsi: Komponen client-side untuk mengelola absensi siswa oleh guru kelas.
 *         Menampilkan daftar siswa dengan opsi input/edit jumlah sakit, izin, dan alpha.
 * Pembuat: Raid Aqil Athallah  - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Pencil, X, Search } from 'lucide-react';

interface SiswaAbsensi {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    jumlah_sakit: number;
    jumlah_izin: number;
    jumlah_alpha: number;
    sudah_diinput: boolean;
}

export default function DataAbsensiPage() {
    const [siswaList, setSiswaList] = useState<SiswaAbsensi[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState({
        jumlah_sakit: '0',
        jumlah_izin: '0',
        jumlah_alpha: '0'
    });
    const [originalEditData, setOriginalEditData] = useState({
        jumlah_sakit: '0',
        jumlah_izin: '0',
        jumlah_alpha: '0'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [showModal, setShowModal] = useState(false);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PAS');

    // Ambil periode aktif dan data absensi
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
                    headers: { Authorization: `Bearer ${token}` }
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

                setSemester(sem);
                setJenisPenilaian(jenis as 'PTS' | 'PAS');

                // Ambil data absensi berdasarkan periode
                await fetchAbsensi(sem, jenis, token);
            } catch (err) {
                console.error('Error load data:', err);
                alert('Gagal terhubung ke server');
            }
        };

        loadData();
    }, []);

    const fetchAbsensi = async (sem: string, jenis: string, token: string) => {
        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/guru-kelas/absensi/${jenis}/${sem}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                } else {
                    alert(data.message || 'Gagal memuat data absensi');
                }
            } else {
                const error = await res.json();
                alert(error.message || 'Gagal memuat data absensi');
            }
        } catch (err) {
            console.error('Error fetch absensi:', err);
            alert('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (siswa: SiswaAbsensi) => {
        const initialData = {
            jumlah_sakit: siswa.jumlah_sakit.toString(),
            jumlah_izin: siswa.jumlah_izin.toString(),
            jumlah_alpha: siswa.jumlah_alpha.toString()
        };
        setEditingId(siswa.id);
        setEditData(initialData);
        setOriginalEditData(initialData);
        setShowModal(true);
        setIsModalClosing(false);
    };

    const handleCloseModal = () => {
        setIsModalClosing(true);
    };

    const handleSave = async () => {
        if (!editingId) return;

        const hasChanges =
            editData.jumlah_sakit !== originalEditData.jumlah_sakit ||
            editData.jumlah_izin !== originalEditData.jumlah_izin ||
            editData.jumlah_alpha !== originalEditData.jumlah_alpha;

        if (!hasChanges) {
            alert('Tidak ada perubahan data.');
            handleCloseModal();
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesi login habis.');
            return;
        }

        const payload = {
            jumlah_sakit: editData.jumlah_sakit === '' ? 0 : Number(editData.jumlah_sakit),
            jumlah_izin: editData.jumlah_izin === '' ? 0 : Number(editData.jumlah_izin),
            jumlah_alpha: editData.jumlah_alpha === '' ? 0 : Number(editData.jumlah_alpha)
        };

        try {
            const res = await fetch(
                `http://localhost:5000/api/guru-kelas/absensi/${editingId}/${jenisPenilaian}/${semester}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (res.ok) {
                alert('Data absensi berhasil disimpan');
                setSiswaList(prev =>
                    prev.map(s =>
                        s.id === editingId
                            ? { ...s, ...payload, sudah_diinput: true }
                            : s
                    )
                );
                handleCloseModal();
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal menyimpan data absensi');
            }
        } catch (err) {
            alert('Gagal terhubung ke server');
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (value === '' || /^\d*$/.test(value)) {
            setEditData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Filter & pagination
    const filteredSiswa = siswaList.filter((siswa) => {
        const query = searchQuery.toLowerCase().trim();
        return !query ||
            siswa.nama.toLowerCase().includes(query) ||
            siswa.nis.includes(query) ||
            siswa.nisn.includes(query);
    });

    const totalPages = Math.ceil(filteredSiswa.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages = [];
        const maxVisible = 5;
        if (currentPage > 1) pages.push(<button key="prev" onClick={() => setCurrentPage(c => c - 1)} className="px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded hover:bg-gray-100">«</button>);
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
            }
        } else {
            pages.push(<button key={1} onClick={() => setCurrentPage(1)} className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded ${currentPage === 1 ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>1</button>);
            if (currentPage > 3) pages.push(<span key="dots1" className="px-1 text-xs sm:px-2 sm:text-sm text-gray-600">...</span>);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded ${currentPage === i ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{i}</button>);
            }
            if (currentPage < totalPages - 2) pages.push(<span key="dots2" className="px-1 text-xs sm:px-2 sm:text-sm text-gray-600">...</span>);
            pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded ${currentPage === totalPages ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}>{totalPages}</button>);
        }
        if (currentPage < totalPages) pages.push(<button key="next" onClick={() => setCurrentPage(c => c + 1)} className="px-2.5 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm border border-gray-300 rounded hover:bg-gray-100">»</button>);
        return pages;
    };

    return (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Absensi Siswa</h1>

                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Kelas: {kelasNama}</h2>
                            <p className="text-xs sm:text-sm text-gray-600">
                                Periode: {jenisPenilaian} - Semester {semester}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                                <span className="text-xs sm:text-sm text-gray-700">Tampilkan</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-xs sm:text-sm text-gray-700">data</span>
                            </div>
                            <div className="relative flex-1 min-w-[180px] sm:min-w-[240px] max-w-[400px]">
                                <div className="absolute inset-y-0 left-2.5 sm:left-3 flex items-center pointer-events-none">
                                    <Search className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Pencarian"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full border border-gray-300 rounded pl-8 sm:pl-10 pr-8 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm"
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
                                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full min-w-[500px] sm:min-w-[600px] table-auto text-xs sm:text-sm">
                        <thead>
                            <tr>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No.</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Nama</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">NIS</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">NISN</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Sakit</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Izin</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Alpha</th>
                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                                        Tidak ada data siswa.
                                    </td>
                                </tr>
                            ) : (
                                currentSiswa.map((siswa, index) => (
                                    <tr
                                        key={siswa.id}
                                        className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                                    >
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle font-medium truncate max-w-[120px] sm:max-w-none">{siswa.nama}</td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle">{siswa.nis}</td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle">{siswa.nisn}</td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle">
                                            {siswa.sudah_diinput ? siswa.jumlah_sakit : <span className="text-gray-400">Belum isi</span>}
                                        </td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle">
                                            {siswa.sudah_diinput ? siswa.jumlah_izin : <span className="text-gray-400">Belum isi</span>}
                                        </td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle">
                                            {siswa.sudah_diinput ? siswa.jumlah_alpha : <span className="text-gray-400">Belum isi</span>}
                                        </td>
                                        <td className="px-2 py-2 sm:px-4 sm:py-3 text-center align-middle whitespace-nowrap">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleEdit(siswa)}
                                                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm font-medium ${
                                                        siswa.sudah_diinput
                                                            ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-800'
                                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                                    }`}
                                                >
                                                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                                                    <span className="hidden sm:inline">
                                                        {siswa.sudah_diinput ? 'Edit' : 'Isi Absensi'}
                                                    </span>
                                                    <span className="sm:hidden">
                                                        {siswa.sudah_diinput ? 'Edit' : 'Isi'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center gap-2 sm:gap-3 mt-4">
                    <div className="text-xs sm:text-sm text-gray-600">
                        Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredSiswa.length)} dari{' '}
                        {filteredSiswa.length} data
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                        {renderPagination()}
                    </div>
                </div>
            </div>

            {showModal && editingId !== null && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${
                        isModalClosing ? 'opacity-0' : 'opacity-100'
                    } p-3 sm:p-4`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseModal();
                    }}
                    onTransitionEnd={() => {
                        if (isModalClosing) {
                            setShowModal(false);
                            setIsModalClosing(false);
                            setEditingId(null);
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-[400px] sm:max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${
                            isModalClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        }`}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Edit Absensi</h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {(() => {
                                const siswa = siswaList.find(s => s.id === editingId);
                                if (!siswa) return null;
                                return (
                                    <>
                                        <div className="text-center">
                                            <h3 className="text-base font-semibold text-gray-800">{siswa.nama}</h3>
                                            <p className="text-xs text-gray-600">
                                                Periode: {jenisPenilaian} - {semester}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { label: 'Sakit', name: 'jumlah_sakit' },
                                                { label: 'Izin', name: 'jumlah_izin' },
                                                { label: 'Alpha', name: 'jumlah_alpha' }
                                            ].map(({ label, name }) => (
                                                <div key={name} className="flex items-center gap-2">
                                                    <label className="font-medium text-sm w-16 sm:w-20">{label}:</label>
                                                    <input
                                                        type="number"
                                                        name={name}
                                                        value={editData[name as keyof typeof editData]}
                                                        onChange={handleChange}
                                                        min="0"
                                                        max="180"
                                                        step="1"
                                                        className="w-16 sm:w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex justify-end gap-2">
                                            <button
                                                onClick={handleCloseModal}
                                                className="px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm border border-gray-300 rounded hover:bg-gray-100 font-medium"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-green-500 hover:bg-green-600 text-white rounded font-medium"
                                            >
                                                Simpan
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}