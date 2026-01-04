/**
* Nama File: input_nilai_client.tsx
* Fungsi: Komponen klien untuk mengelola input nilai siswa oleh guru bidang studi,
*         mencakup pemilihan mata pelajaran dan kelas, tampilan tabel nilai,
*         serta fitur edit dan detail nilai per komponen.
* Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Syahrul Ramadhan - NIM: 3312301093
* Tanggal: 15 September 2025
*/
'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { Pencil, Eye, Search, X } from 'lucide-react';

// ====== TYPES ======
interface Mapel {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
}

interface NilaiSiswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    nilai_rapor: number;
    deskripsi: string;
    nilai: Record<number, number | null>;
}

interface Komponen {
    id: number;
    nama: string;
    bobot: number;
}

interface KelasItem {
    kelas_id: number;
    nama_kelas: string;
}

export default function InputNilaiClient() {
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [mapelList, setMapelList] = useState<Mapel[]>([]);
    const [kelasList, setKelasList] = useState<KelasItem[]>([]);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
    const [siswaList, setSiswaList] = useState<NilaiSiswa[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<NilaiSiswa[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMapel, setLoadingMapel] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('');
    const [currentMapel, setCurrentMapel] = useState<Mapel | null>(null);
    const [komponenList, setKomponenList] = useState<Komponen[]>([]);

    // Modal Detail
    const [showDetail, setShowDetail] = useState(false);
    const [detailSiswa, setDetailSiswa] = useState<NilaiSiswa | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);

    // Modal Edit Komponen
    const [editingSiswa, setEditingSiswa] = useState<NilaiSiswa | null>(null);
    const [editingKomponenNilai, setEditingKomponenNilai] = useState<Record<number, number | null>>({});
    const initialEditingKomponenNilaiRef = useRef<Record<number, number | null>>({});
    const [editKomponenClosing, setEditKomponenClosing] = useState(false);
    const [saving, setSaving] = useState(false);

    // ====== FETCH MAPEL ======
    useEffect(() => {
        const fetchMapel = async () => {
            setLoadingMapel(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token tidak ditemukan. Silakan login ulang.');
                }
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/mapel', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(`HTTP ${res.status}: ${errorData.message || 'Gagal memuat mata pelajaran'}`);
                }
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.message || 'Respons backend tidak sukses');
                }
                setMapelList(data.data || []);
            } catch (err) {
                console.error('Error fetch mapel:', err);
                alert(`Gagal memuat mata pelajaran: ${err instanceof Error ? err.message : 'Coba lagi.'}`);
            } finally {
                setLoadingMapel(false);
            }
        };
        fetchMapel();
    }, []);

    // ====== FETCH KELAS BERDASARKAN MAPEL ======
    useEffect(() => {
        if (selectedMapelId === null) {
            setKelasList([]);
            setSelectedKelasId(null);
            return;
        }
        const fetchKelas = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kelas', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat daftar kelas');
                const data = await res.json();
                if (data.success) {
                    setKelasList(data.data || []);
                    if (data.data && data.data.length === 1) {
                        setSelectedKelasId(data.data[0].kelas_id);
                    }
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
                setKelasList([]);
            }
        };
        fetchKelas();
    }, [selectedMapelId]);

    // ====== FETCH KOMPONEN ======
    useEffect(() => {
        const fetchKomponen = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/komponen', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat komponen penilaian');
                const data = await res.json();
                if (data.success) {
                    const komponen: Komponen[] = data.data.map((k: any) => ({
                        id: k.id_komponen,
                        nama: k.nama_komponen,
                        bobot: k.persentase || 0,
                    }));
                    setKomponenList(komponen);
                }
            } catch (err) {
                console.error('Error fetch komponen:', err);
            }
        };
        fetchKomponen();
    }, []);

    // ====== FETCH NILAI SAAT MAPEL & KELAS DIPILIH ======
    useEffect(() => {
        if (selectedMapelId === null || selectedKelasId === null) {
            setSiswaList([]);
            setFilteredSiswa([]);
            setCurrentMapel(null);
            return;
        }
        const fetchNilai = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');
                const res = await fetch(
                    `http://localhost:5000/api/guru-bidang-studi/nilai/${selectedMapelId}/${selectedKelasId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Gagal mengambil data nilai');
                }
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.message || 'Operasi gagal');
                }
                const jenisAktif = data.jenis_penilaian_aktif || null;
                setJenisPenilaianAktif(jenisAktif);
                if (!Array.isArray(data.siswaList)) {
                    throw new Error('Data siswa tidak valid');
                }
                const komponenUntukRender = komponenList.length > 0
                    ? komponenList
                    : [
                        { id: 1, nama: 'UH 1', bobot: 0 },
                        { id: 2, nama: 'UH 2', bobot: 0 },
                        { id: 3, nama: 'UH 3', bobot: 0 },
                        { id: 4, nama: 'UH 4', bobot: 0 },
                        { id: 5, nama: 'UH 5', bobot: 0 },
                        { id: 6, nama: 'PTS', bobot: 0 },
                        { id: 7, nama: 'PAS', bobot: 0 },
                    ];
                const siswaWithNilai = data.siswaList.map((s: any) => {
                    const nilaiRecord: Record<number, number | null> = {};
                    komponenUntukRender.forEach(k => {
                        nilaiRecord[k.id] = s.nilai?.[k.id] ?? null;
                    });
                    const nilaiRapor = typeof s.nilai_rapor === 'number' ? Math.floor(s.nilai_rapor) : 0;
                    return {
                        id: s.id,
                        nama: s.nama,
                        nis: s.nis,
                        nisn: s.nisn,
                        nilai_rapor: nilaiRapor,
                        deskripsi: s.deskripsi || 'Belum ada deskripsi',
                        nilai: nilaiRecord,
                    };
                });
                setSiswaList(siswaWithNilai);
                setFilteredSiswa(siswaWithNilai);
                setKelasNama(data.kelas || '');
                const mapel = mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null;
                setCurrentMapel(mapel);
            } catch (err) {
                console.error('Error fetch nilai:', err);
                alert('Gagal memuat data nilai: ' + (err instanceof Error ? err.message : 'Coba lagi.'));
            } finally {
                setLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, selectedKelasId, komponenList]);

    // ====== FILTER SISWA ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            const filtered = siswaList.filter(
                s => s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
            );
            setFilteredSiswa(filtered);
        }
    }, [searchQuery, siswaList]);

    // ====== SIMPAN NILAI KOMPONEN ======
    const simpanNilaiKomponen = async () => {
        if (!editingSiswa || !selectedMapelId || !selectedKelasId) return;

        // Cek validasi nilai
        for (const [idStr, nilai] of Object.entries(editingKomponenNilai)) {
            if (nilai !== null) {
                if (typeof nilai !== 'number' || isNaN(nilai) || nilai < 0 || nilai > 100) {
                    const komponenNama = komponenList.find(k => k.id == Number(idStr))?.nama || idStr;
                    alert(`Nilai untuk komponen "${komponenNama}" tidak valid. Harus berupa angka bulat antara 0 dan 100.`);
                    return;
                }
                if (!Number.isInteger(nilai)) {
                    alert(`Nilai untuk komponen "${komponenNama}" harus bilangan bulat.`);
                    return;
                }
            }
        }

        // === Cek apakah ada perubahan ===
        const hasChanges = Object.keys(editingKomponenNilai).some(key => {
            const kId = Number(key);
            const current = editingKomponenNilai[kId];
            const initial = initialEditingKomponenNilaiRef.current[kId];
            return current !== initial;
        });

        if (!hasChanges) {
            alert('Tidak ada perubahan data.');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token tidak ditemukan');
            const payload = { nilai: editingKomponenNilai };
            const res = await fetch(
                `http://localhost:5000/api/guru-bidang-studi/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menyimpan nilai komponen');
            }
            const data = await res.json();
            const updatedSiswa = {
                ...editingSiswa,
                nilai: editingKomponenNilai,
                nilai_rapor: data.nilai_rapor,
                deskripsi: data.deskripsi,
            };
            setSiswaList(prev => prev.map(s => (s.id === editingSiswa.id ? updatedSiswa : s)));
            setFilteredSiswa(prev => prev.map(s => (s.id === editingSiswa.id ? updatedSiswa : s)));
            setEditingSiswa(null);
            alert('Nilai komponen berhasil disimpan');
        } catch (err) {
            console.error('Error simpan nilai komponen:', err);
            alert('Gagal menyimpan: ' + (err instanceof Error ? err.message : 'Coba lagi.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDetail = (siswa: NilaiSiswa) => {
        setDetailSiswa(siswa);
        setShowDetail(true);
    };

    const openEditKomponen = (siswa: NilaiSiswa) => {
        const nilaiAwal = { ...siswa.nilai };
        setEditingSiswa(siswa);
        setEditingKomponenNilai(nilaiAwal);
        initialEditingKomponenNilaiRef.current = { ...nilaiAwal };
    };

    // ====== PAGINATION ======
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, startIndex + itemsPerPage);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const maxVisible = 5;
        if (currentPage > 1) {
            pages.push(
                <button
                    key="prev"
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                    «
                </button>
            );
        }
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(
                    <button
                        key={i}
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
                    key={1}
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
                        key={i}
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
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-1 border border-gray-300 rounded ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                        }`}
                >
                    {totalPages}
                </button>
            );
        }
        if (currentPage < totalPages) {
            pages.push(
                <button
                    key="next"
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                    »
                </button>
            );
        }
        return pages;
    };

    // ====== RENDER ======
    return (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Input Nilai Siswa</h1>
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    {/* Dropdown Mapel */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pilih Mata Pelajaran
                        </label>
                        {loadingMapel ? (
                            <div className="text-gray-500">Memuat...</div>
                        ) : (
                            <select
                                value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedMapelId(val ? Number(val) : null);
                                    setSelectedKelasId(null);
                                }}
                                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList
                                    .filter(mapel => mapel.mata_pelajaran_id != null && mapel.jenis === 'pilihan')
                                    .map(mapel => (
                                        <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                                            {mapel.nama_mapel} ({mapel.jenis})
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                    {/* Dropdown Kelas */}
                    {selectedMapelId && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pilih Kelas
                            </label>
                            {kelasList.length === 0 ? (
                                <div className="text-gray-500">Tidak ada kelas yang ditemukan</div>
                            ) : (
                                <select
                                    value={selectedKelasId || ''}
                                    onChange={e => setSelectedKelasId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {kelasList.map(kelas => (
                                        <option key={kelas.kelas_id} value={kelas.kelas_id}>
                                            {kelas.nama_kelas}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                    {selectedMapelId && selectedKelasId ? (
                        <>
                            {/* Pencarian */}
                            <div className="mb-4 relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Pencarian"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {/* Tabel */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mb-6">
                                <table className="w-full table-auto text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold">No.</th>
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[140px]">
                                                Nama
                                            </th>
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[100px]">
                                                NIS
                                            </th>
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[120px]">
                                                NISN
                                            </th>
                                            {komponenList.map(k => (
                                                <th
                                                    key={k.id}
                                                    className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[60px]"
                                                >
                                                    {k.nama}
                                                </th>
                                            ))}
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[90px]">
                                                Nilai Rapor
                                            </th>
                                            <th className="px-3 py-3 text-center bg-gray-800 text-white font-semibold min-w-[100px]">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={8 + komponenList.length} className="px-4 py-8 text-center text-gray-500">
                                                    Memuat data...
                                                </td>
                                            </tr>
                                        ) : currentSiswa.length === 0 ? (
                                            <tr>
                                                <td colSpan={8 + komponenList.length} className="px-4 py-8 text-center text-gray-500">
                                                    Tidak ada data siswa
                                                </td>
                                            </tr>
                                        ) : (
                                            currentSiswa.map((siswa, idx) => (
                                                <tr
                                                    key={siswa.id}
                                                    className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                >
                                                    <td className="px-3 py-3 text-center">{startIndex + idx + 1}</td>
                                                    <td className="px-3 py-3 text-center font-medium">{siswa.nama}</td>
                                                    <td className="px-3 py-3 text-center">{siswa.nis}</td>
                                                    <td className="px-3 py-3 text-center">{siswa.nisn}</td>
                                                    {komponenList.map(k => (
                                                        <td key={`${siswa.id}-${k.id}`} className="px-3 py-3 text-center">
                                                            {siswa.nilai[k.id] !== null ? siswa.nilai[k.id] : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-3 text-center font-medium">{siswa.nilai_rapor}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                onClick={() => handleDetail(siswa)}
                                                                className="bg-green-400 hover:bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                                                            >
                                                                <Eye size={12} /> Lihat
                                                            </button>
                                                            <button
                                                                onClick={() => openEditKomponen(siswa)}
                                                                className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 py-1 rounded text-xs flex items-center gap-1"
                                                            >
                                                                <Pencil size={12} /> Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div className="text-sm text-gray-600">
                                    Menampilkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredSiswa.length)} dari{' '}
                                    {filteredSiswa.length} data
                                </div>
                                <div className="flex gap-1">{renderPagination()}</div>
                            </div>
                            {/* Modal Detail */}
                            {showDetail && detailSiswa && (
                                <div
                                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'
                                        } p-4`}
                                    onClick={e => e.target === e.currentTarget && setDetailClosing(true)}
                                    onTransitionEnd={() => {
                                        if (detailClosing) {
                                            setShowDetail(false);
                                            setDetailClosing(false);
                                        }
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gray-900/70"></div>
                                    <div
                                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                            }`}
                                    >
                                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                            <h2 className="text-xl font-bold text-gray-800">Detail Nilai</h2>
                                            <button onClick={() => setDetailClosing(true)} className="text-gray-500 hover:text-gray-700">
                                                <X size={24} />
                                            </button>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-2 mb-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Nama:</span>
                                                        <span className="ml-2">{detailSiswa.nama}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">NIS:</span>
                                                        <span className="ml-2">{detailSiswa.nis}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">NISN:</span>
                                                        <span className="ml-2">{detailSiswa.nisn}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Nilai Rapor:</span>
                                                        <span className="ml-2 font-semibold">{detailSiswa.nilai_rapor}</span>
                                                    </div>
                                                </div>
                                                {/* Deskripsi - Full Width */}
                                                <div className="mb-6">
                                                    <h3 className="font-semibold text-gray-800 mb-2">Deskripsi:</h3>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                                                        {detailSiswa.deskripsi || 'Tidak ada deskripsi'}
                                                    </p>
                                                </div>
                                            </div>
                                            <h3 className="font-semibold mb-2">Nilai Komponen:</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {komponenList.map(k => (
                                                    <div key={k.id} className="bg-orange-50 p-2 rounded text-center">
                                                        <div className="text-xs font-medium text-orange-700">{k.nama}</div>
                                                        <div className="text-lg font-bold mt-1">
                                                            {detailSiswa.nilai[k.id] !== null ? detailSiswa.nilai[k.id] : '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button
                                                    onClick={() => setDetailClosing(true)}
                                                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                                                >
                                                    Tutup
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        openEditKomponen(detailSiswa);
                                                        setDetailClosing(true);
                                                    }}
                                                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded"
                                                >
                                                    Edit Nilai
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Modal Edit Komponen */}
                            {editingSiswa && (
                                <div
                                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${editKomponenClosing ? 'opacity-0' : 'opacity-100'
                                        } p-4`}
                                    onClick={e => e.target === e.currentTarget && setEditKomponenClosing(true)}
                                    onTransitionEnd={() => {
                                        if (editKomponenClosing) {
                                            setEditingSiswa(null);
                                            setEditKomponenClosing(false);
                                        }
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gray-900/70"></div>
                                    <div
                                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${editKomponenClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                            }`}
                                    >
                                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                            <h2 className="text-xl font-bold text-gray-800">Edit Nilai Komponen</h2>
                                            <button
                                                onClick={() => setEditKomponenClosing(true)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                <X size={24} />
                                            </button>
                                        </div>
                                        <div className="p-6">
                                            <p className="mb-4">
                                                <span className="font-medium">Siswa:</span> {editingSiswa.nama}
                                            </p>
                                            <div className="space-y-3 mb-6">
                                                {komponenList.map(komponen => (
                                                    <div key={komponen.id} className="flex flex-col">
                                                        <label className="text-sm font-medium text-gray-700 mb-1">
                                                            {komponen.nama}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={editingKomponenNilai[komponen.id] ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    setEditingKomponenNilai(prev => ({
                                                                        ...prev,
                                                                        [komponen.id]: null,
                                                                    }));
                                                                } else {
                                                                    const numValue = parseInt(val, 10);
                                                                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                                                        setEditingKomponenNilai(prev => ({
                                                                            ...prev,
                                                                            [komponen.id]: numValue,
                                                                        }));
                                                                    }
                                                                }
                                                            }}
                                                            disabled={jenisPenilaianAktif === 'PTS' && !/PTS/i.test(komponen.nama)}
                                                            className={`w-full border rounded px-3 py-2 text-sm ${jenisPenilaianAktif === 'PTS' && !/PTS/i.test(komponen.nama)
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                                                                : 'border-gray-300'
                                                                }`}
                                                            placeholder="0–100"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setEditKomponenClosing(true)}
                                                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    onClick={simpanNilaiKomponen}
                                                    disabled={saving}
                                                    className={`px-4 py-2 rounded ${saving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                        }`}
                                                >
                                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 bg-yellow-50 rounded-lg border border-dashed border-yellow-300">
                            <p className="text-gray-700 text-lg font-medium">
                                {selectedMapelId && !selectedKelasId
                                    ? 'Silakan pilih Kelas terlebih dahulu.'
                                    : 'Silakan pilih Mata Pelajaran terlebih dahulu.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}