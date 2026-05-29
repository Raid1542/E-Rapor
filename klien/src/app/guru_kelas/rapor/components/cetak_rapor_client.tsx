'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle } from 'lucide-react';

interface Siswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
}

interface TahunAjaranInfo {
    tahun_ajaran: string;
    semester: 'Ganjil' | 'Genap';
    status_pts: 'nonaktif' | 'aktif' | 'selesai';
    status_pas: 'nonaktif' | 'aktif' | 'selesai';
}

const RaporGuruKelasClient = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const [jenisPenilaian, setJenisPenilaian] = useState<string>('');
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [tahunAjaranInfo, setTahunAjaranInfo] = useState<TahunAjaranInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // === Fetch tahun ajaran aktif ===
    const fetchTahunAjaranAktif = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Silakan login terlebih dahulu');
                return;
            }

            const res = await fetch(`${API_BASE}/guru-kelas/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const ta = data.data;
                setTahunAjaranInfo({
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: ta.semester as 'Ganjil' | 'Genap',
                    status_pts: ta.status_pts,
                    status_pas: ta.status_pas,
                });
            } else {
                setError(data.message || 'Gagal mengambil tahun ajaran aktif');
            }
        } catch (err) {
            console.error('Gagal ambil tahun ajaran aktif:', err);
            setError('Gagal terhubung ke server');
        }
    };

    // === Fetch daftar siswa ===
    const fetchSiswaList = async () => {
        if (!tahunAjaranInfo) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Silakan login terlebih dahulu');
                return;
            }

            const res = await fetch(`${API_BASE}/guru-kelas/siswa`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSiswaList(data.data);
            } else {
                setError(data.message || 'Gagal memuat data siswa');
            }
        } catch (err) {
            console.error('Error fetch siswa:', err);
            setError('Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    // === Ambil tahun ajaran aktif saat mount ===
    useEffect(() => {
        fetchTahunAjaranAktif();
    }, []);

    // === Ambil daftar siswa saat jenisPenilaian dipilih ===
    useEffect(() => {
        if (jenisPenilaian && tahunAjaranInfo) {
            setLoading(true);
            fetchSiswaList();
        } else {
            setSiswaList([]);
            setLoading(false);
        }
    }, [jenisPenilaian, tahunAjaranInfo]);

    // === Helper: status penilaian saat ini ===
    const getCurrentStatus = (): 'nonaktif' | 'aktif' | 'selesai' | null => {
        if (!jenisPenilaian || !tahunAjaranInfo) return null;
        return jenisPenilaian.includes('PTS')
            ? tahunAjaranInfo.status_pts
            : tahunAjaranInfo.status_pas;
    };

    // === Perbaikan: Unduh rapor dengan nama file yang sesuai (tanpa parsing header) ===
    const handleDownloadRapor = async (siswaId: number) => {
        const token = localStorage.getItem('token');
        if (!token || !jenisPenilaian || !tahunAjaranInfo) {
            alert('Data tidak lengkap. Silakan pilih jenis penilaian.');
            return;
        }

        const jenisMurni = jenisPenilaian.startsWith('PTS') ? 'PTS' : 'PAS';

        try {
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor/${siswaId}/${jenisMurni}/${tahunAjaranInfo.semester.toLowerCase()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal mengunduh rapor');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // ✅ Langsung gunakan nama file sesuai backend
            a.download = `rapor_${jenisMurni.toLowerCase()}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('Download error:', err);
            alert('Gagal mengunduh: ' + (err.message || 'Coba lagi'));
        }
    };

    // === State derived ===
    const currentStatus = getCurrentStatus();
    const isDownloadAllowed = currentStatus === 'aktif';
    const optionsJenisPenilaian = tahunAjaranInfo
        ? [
            { value: `PTS-${tahunAjaranInfo.semester.toLowerCase()}`, label: `Penilaian Tengah Semester (${tahunAjaranInfo.semester})` },
            { value: `PAS-${tahunAjaranInfo.semester.toLowerCase()}`, label: `Penilaian Akhir Semester (${tahunAjaranInfo.semester})` },
        ]
        : [];

    return (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Cetak Rapor</h1>

                {/* Info Tahun Ajaran */}
                {tahunAjaranInfo && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800 font-medium">
                            Tahun Ajaran: <span className="font-bold">{tahunAjaranInfo.tahun_ajaran}</span> |
                            Semester: <span className="font-bold">{tahunAjaranInfo.semester}</span>
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Dropdown Jenis Penilaian */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jenis Penilaian
                    </label>
                    <select
                        value={jenisPenilaian}
                        onChange={(e) => setJenisPenilaian(e.target.value)}
                        className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Pilih Jenis --</option>
                        {optionsJenisPenilaian.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Penilaian */}
                {jenisPenilaian && currentStatus && (
                    <div className="mb-6 p-3 bg-gray-100 rounded-lg">
                        <p className="text-gray-700">
                            Status {jenisPenilaian.includes('PTS') ? 'PTS' : 'PAS'}:
                            <span
                                className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${currentStatus === 'aktif'
                                        ? 'bg-green-100 text-green-800'
                                        : currentStatus === 'selesai'
                                            ? 'bg-gray-200 text-gray-700'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}
                            >
                                {currentStatus === 'aktif'
                                    ? 'Aktif'
                                    : currentStatus === 'selesai'
                                        ? 'Terkunci'
                                        : 'Belum Dibuka'}
                            </span>
                        </p>
                    </div>
                )}

                {/* Konten Dinamis */}
                {jenisPenilaian === '' ? (
                    <div className="mt-8 text-center py-10 bg-yellow-50 border border-dashed border-yellow-300 rounded-xl">
                        <p className="text-gray-700 text-lg font-medium">
                            Silakan pilih jenis penilaian terlebih dahulu.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="mt-8 text-center py-10">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 mb-3"></div>
                        <p className="text-gray-600">Memuat daftar siswa...</p>
                    </div>
                ) : siswaList.length === 0 ? (
                    <div className="mt-8 text-center py-10 bg-gray-100 rounded-xl">
                        <p className="text-gray-700">Tidak ada siswa di kelas Anda.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Daftar Siswa {jenisPenilaian}
                            </h2>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full min-w-[500px] table-auto text-sm">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="px-3 py-3 text-center font-semibold">No.</th>
                                        <th className="px-3 py-3 text-left font-semibold">Nama</th>
                                        <th className="px-3 py-3 text-center font-semibold">NIS</th>
                                        <th className="px-3 py-3 text-center font-semibold">NISN</th>
                                        <th className="px-3 py-3 text-center font-semibold">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {siswaList.map((siswa, index) => (
                                        <tr
                                            key={siswa.id}
                                            className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                                        >
                                            <td className="px-3 py-3 text-center">{index + 1}</td>
                                            <td className="px-3 py-3 font-medium text-gray-800">{siswa.nama}</td>
                                            <td className="px-3 py-3 text-center text-gray-700">{siswa.nis}</td>
                                            <td className="px-3 py-3 text-center text-gray-700">{siswa.nisn}</td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => handleDownloadRapor(siswa.id)}
                                                    disabled={!isDownloadAllowed}
                                                    className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs sm:text-sm gap-1 min-w-[90px] ${isDownloadAllowed
                                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Download size={14} />
                                                    <span>{isDownloadAllowed ? 'Unduh' : 'Tidak Tersedia'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!isDownloadAllowed && (
                            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                Rapor {jenisPenilaian} belum tersedia untuk diunduh karena statusnya "{currentStatus}".
                            </div>
                        )}

                        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-700">
                            <p className="font-medium mb-1.5">Catatan:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                                <li>Buka dengan Microsoft Word untuk tampilan terbaik</li>
                                <li>PAS Semester Genap mencantumkan status kenaikan kelas</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RaporGuruKelasClient;