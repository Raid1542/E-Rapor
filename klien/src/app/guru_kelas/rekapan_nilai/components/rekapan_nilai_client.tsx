// File: rekapan_nilai_client.tsx
// Fungsi: Komponen utama untuk menampilkan dan mengelola rekapan nilai rapor,
//         termasuk fitur lihat detail per siswa dan ekspor ke Excel.
// Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
// Tanggal: 15 September 2025

'use client';

import { useState, useEffect } from 'react';
import { Search, Upload, X, Eye } from 'lucide-react';

interface SiswaRekapan {
    id: number;
    nama: string;
    nis: string;
    nilaiMapel: Record<string, number | null>; 
    rataRata: number | null;
    deskripsiRataRata: string;
    ranking: number | null;
}

const RekapanNilaiClient = () => {
    const [siswaList, setSiswaList] = useState<SiswaRekapan[]>([]);
    const [mapelList, setMapelList] = useState<string[]>([]); 
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDetail, setShowDetail] = useState(false);
    const [detailSiswa, setDetailSiswa] = useState<SiswaRekapan | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);

    // Fetch data rekapan nilai
    const fetchRekapanNilai = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Silakan login terlebih dahulu');
                return;
            }

            const res = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (res.ok && data.siswa && Array.isArray(data.mapel_list)) {
                const siswa: SiswaRekapan[] = data.siswa.map((s: any) => ({
                    id: s.id_siswa,
                    nama: s.nama,
                    nis: s.nis,
                    nilaiMapel: s.nilai_mapel || {},
                    rataRata: s.rata_rata != null ? parseFloat(s.rata_rata.toFixed(2)) : null,
                    deskripsiRataRata: s.deskripsi_rata_rata || 'Belum ada deskripsi',
                    ranking: s.ranking || null,
                }));
                const mapel: string[] = data.mapel_list; 

                setSiswaList(siswa);
                setMapelList(mapel);
            } else {
                alert('Gagal memuat rekapan nilai: ' + (data.message || 'Error tidak dikenal'));
            }
        } catch (err) {
            console.error('Error fetch rekapan:', err);
            alert('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRekapanNilai();
    }, []);

    // Auto-refresh jika ada signal dari input nilai
    useEffect(() => {
        const checkForUpdate = () => {
            const lastSignal = localStorage.getItem('rekapan_perlu_update');
            const lastFetch = localStorage.getItem('rekapan_terakhir_diambil') || '0';
            if (lastSignal && lastSignal > lastFetch) {
                fetchRekapanNilai();
                localStorage.setItem('rekapan_terakhir_diambil', lastSignal);
            }
        };
        checkForUpdate();
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'rekapan_perlu_update') checkForUpdate();
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleDetail = (siswa: SiswaRekapan) => {
        setDetailSiswa(siswa);
        setShowDetail(true);
        setDetailClosing(false);
    };

    const filteredSiswa = siswaList
        .filter((siswa) => {
            const q = searchQuery.toLowerCase().trim();
            return !q || siswa.nama.toLowerCase().includes(q) || siswa.nis.includes(q);
        })
        .sort((a, b) => {
            if (a.ranking === null && b.ranking === null) return 0;
            if (a.ranking === null) return 1;
            if (b.ranking === null) return -1;
            return a.ranking - b.ranking;
        });

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai/export-excel', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Gagal ekspor');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rekapan_nilai_kelas_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Gagal mengunduh file Excel');
        }
    };

    return (
        <div className="flex-1 p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Rekapan Nilai Rapor</h1>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Upload size={20} /> Ekspor Excel
                        </button>

                        <div className="relative flex-1 min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Pencarian"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 rounded pl-10 pr-10 py-2 text-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
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
                                    <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">No</th>
                                    <th className="px-4 py-3 text-left sticky top-0 bg-gray-800 text-white z-10 font-semibold">Nama</th>
                                    <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">NIS</th>
                                    {/* Tampilkan SEMUA mapel dari mapelList */}
                                    {mapelList.map((kodeMapel) => (
                                        <th
                                            key={kodeMapel}
                                            className="px-3 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold min-w-[60px]"
                                        >
                                            {kodeMapel}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Rata-rata</th>
                                    <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Detail</th>
                                    <th className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">Ranking</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5 + mapelList.length} className="px-4 py-8 text-center text-gray-500">
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : filteredSiswa.length === 0 ? (
                                    <tr>
                                        <td colSpan={5 + mapelList.length} className="px-4 py-8 text-center text-gray-500">
                                            Tidak ada data siswa
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSiswa.map((siswa, index) => (
                                        <tr
                                            key={siswa.id}
                                            className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                                        >
                                            <td className="px-4 py-3 text-center align-middle">{index + 1}</td>
                                            <td className="px-4 py-3 align-middle font-medium">{siswa.nama}</td>
                                            <td className="px-4 py-3 text-center align-middle">{siswa.nis}</td>
                                            {/* Tampilkan nilai untuk SETIAP mapel, meskipun null */}
                                            {mapelList.map((kodeMapel) => (
                                                <td key={kodeMapel} className="px-3 py-3 text-center align-middle">
                                                    {siswa.nilaiMapel[kodeMapel] !== undefined && siswa.nilaiMapel[kodeMapel] !== null
                                                        ? Math.floor(siswa.nilaiMapel[kodeMapel]!)
                                                        : '-'}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center align-middle font-medium">
                                                {siswa.rataRata !== null ? siswa.rataRata.toFixed(2) : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => handleDetail(siswa)}
                                                    className="bg-green-400 hover:bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 mx-auto"
                                                >
                                                    <Eye size={12} /> Lihat
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center align-middle">
                                                {siswa.ranking ? `${siswa.ranking}` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal Detail */}
                    {showDetail && detailSiswa && (
                        <div
                            className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'} p-4`}
                            onClick={(e) => e.target === e.currentTarget && setDetailClosing(true)}
                            onTransitionEnd={() => {
                                if (detailClosing) {
                                    setShowDetail(false);
                                    setDetailClosing(false);
                                    setDetailSiswa(null);
                                }
                            }}
                        >
                            <div className="absolute inset-0 bg-gray-900/70"></div>
                            <div
                                className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                            >
                                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-800">Detail Rekapan Nilai</h2>
                                    <button onClick={() => setDetailClosing(true)} className="text-gray-500 hover:text-gray-700">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="p-6">
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
                                            <span className="font-medium text-gray-700">Rata-rata:</span>
                                            <span className="ml-2 font-semibold">
                                                {detailSiswa.rataRata !== null ? detailSiswa.rataRata.toFixed(2) : '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Ranking:</span>
                                            <span className="ml-2 font-semibold">
                                                {detailSiswa.ranking ? `${detailSiswa.ranking}` : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-semibold text-gray-800 mb-2">Deskripsi:</h3>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border whitespace-pre-wrap break-words">
                                            {detailSiswa.deskripsiRataRata || 'Tidak ada deskripsi'}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-3">Nilai per Mata Pelajaran:</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {/* Tampilkan SEMUA mapel, meskipun nilainya null */}
                                            {mapelList.map((kodeMapel) => (
                                                <div key={kodeMapel} className="bg-orange-50 p-3 rounded text-center">
                                                    <div className="text-xs font-medium text-orange-700">{kodeMapel}</div>
                                                    <div className="text-lg font-bold mt-1">
                                                        {detailSiswa.nilaiMapel[kodeMapel] !== undefined && detailSiswa.nilaiMapel[kodeMapel] !== null
                                                            ? Math.floor(detailSiswa.nilaiMapel[kodeMapel]!)
                                                            : '-'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={() => setDetailClosing(true)}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RekapanNilaiClient;