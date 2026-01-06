/**
 * Nama File: atur_penilaian_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian akademik
 *         oleh guru bidang studi, mencakup kategori nilai dan bobot komponen.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Syahrul Ramadhan - NIM: 3312301093
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, X, Plus, Trash2 } from 'lucide-react';

// ====== TIPE DATA (SESUAI DENGAN BACKEND - SNAKE_CASE) ======
interface MapelItem {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
}

interface KategoriAkademik {
    id: number;
    min_nilai: number;
    max_nilai: number;
    deskripsi: string;
    urutan: number;
}

interface KomponenPenilaian {
    id_komponen: number;
    nama_komponen: string;
    urutan: number;
}

interface BobotItem {
    komponen_id: number;
    bobot: number;
    is_active: boolean;
}

// ====== KOMPONEN UTAMA ======
export default function AturPenilaianClient() {
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [activeTab, setActiveTab] = useState<'akademik' | 'bobot'>('akademik');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [kategoriList, setKategoriList] = useState<KategoriAkademik[]>([]);
    const [showEditKategori, setShowEditKategori] = useState(false);
    const [editKategoriId, setEditKategoriId] = useState<number | null>(null);
    const [editKategoriClosing, setEditKategoriClosing] = useState(false);
    const [editKategoriData, setEditKategoriData] = useState({
        min_nilai: 0,
        max_nilai: 100,
        deskripsi: '',
    });

    const initialEditKategoriDataRef = useRef<typeof editKategoriData | null>(null);

    const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);

    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [bobotList, setBobotList] = useState<BobotItem[]>([]);
    const [bobotLoading, setBobotLoading] = useState(false);

    const initialBobotListRef = useRef<BobotItem[]>([]);

    // ====== FETCH DATA DUKUNGAN ======
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');

                const taRes = await fetch('http://localhost:5000/api/guru-bidang-studi/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!taRes.ok) throw new Error('Gagal ambil tahun ajaran aktif');
                const taData = await taRes.json();
                const { status_pts, status_pas } = taData.data;
                const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
                setJenisPenilaianAktif(jenisAktif);

                const [resKomponen, resMapel] = await Promise.all([
                    fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/komponen', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch('http://localhost:5000/api/guru-bidang-studi/atur-penilaian/mapel', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (!resKomponen.ok || !resMapel.ok) {
                    throw new Error('Gagal mengambil data pendukung');
                }

                const komponenData = await resKomponen.json();
                const mapelData = await resMapel.json();

                setKomponenList(komponenData.data || []);
                setMapelList(mapelData.data || []);
            } catch (err: any) {
                console.error('Error fetch data pendukung:', err);
                setError(err.message || 'Gagal memuat data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ====== FETCH KATEGORI AKADEMIK PER MAPEL ======
    useEffect(() => {
        if (!selectedMapelAkademik) {
            setKategoriList([]);
            return;
        }

        const fetchKategori = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kategori?mapel_id=${selectedMapelAkademik}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error('Gagal mengambil kategori akademik');
                const data = await res.json();
                setKategoriList(data.data || []);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat kategori');
            } finally {
                setLoading(false);
            }
        };

        fetchKategori();
    }, [selectedMapelAkademik]);

    // ====== FETCH BOBOT PER MAPEL ======
    useEffect(() => {
        if (selectedMapelId === null) {
            setBobotList([]);
            initialBobotListRef.current = [];
            return;
        }

        const fetchBobot = async () => {
            setBobotLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/bobot/${selectedMapelId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                let bobotData: any[] = [];
                if (res.ok) {
                    const result = await res.json();
                    bobotData = result.data || [];
                }

                const bobotMap = new Map<number, number>();
                bobotData.forEach((b: any) => {
                    const numBobot = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
                    bobotMap.set(b.komponen_id, isNaN(numBobot) ? 0 : numBobot);
                });

                const fullBobot = komponenList.map((k) => ({
                    komponen_id: k.id_komponen,
                    bobot: bobotMap.get(k.id_komponen) || 0,
                    is_active: true,
                }));

                setBobotList(fullBobot);
                initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
            } catch (err) {
                alert('Gagal mengambil bobot penilaian');
            } finally {
                setBobotLoading(false);
            }
        };

        fetchBobot();
    }, [selectedMapelId, komponenList]);

    // ====== MODAL KATEGORI ======
    const openEditKategori = (kategori: KategoriAkademik | null = null) => {
        if (kategori) {
            setEditKategoriId(kategori.id);
            setEditKategoriData({
                min_nilai: kategori.min_nilai,
                max_nilai: kategori.max_nilai,
                deskripsi: kategori.deskripsi,
            });
            initialEditKategoriDataRef.current = {
                min_nilai: kategori.min_nilai,
                max_nilai: kategori.max_nilai,
                deskripsi: kategori.deskripsi,
            };
        } else {
            setEditKategoriId(null);
            setEditKategoriData({ min_nilai: 0, max_nilai: 100, deskripsi: '' });
            initialEditKategoriDataRef.current = null;
        }
        setShowEditKategori(true);
    };

    const closeEditKategori = () => {
        setEditKategoriClosing(true);
        setTimeout(() => {
            setShowEditKategori(false);
            setEditKategoriClosing(false);
            setEditKategoriId(null);
        }, 200);
    };

    const handleSaveKategori = async () => {
        const initial = initialEditKategoriDataRef.current;
        const isUnchanged =
            initial &&
            editKategoriData.min_nilai === initial.min_nilai &&
            editKategoriData.max_nilai === initial.max_nilai &&
            editKategoriData.deskripsi === initial.deskripsi;

        if (isUnchanged) {
            alert('Tidak ada perubahan data.');
            return;
        }

        if (selectedMapelAkademik === null) {
            alert('Pilih mata pelajaran terlebih dahulu');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                min_nilai: editKategoriData.min_nilai,
                max_nilai: editKategoriData.max_nilai,
                deskripsi: editKategoriData.deskripsi,
                urutan: 0,
                mapel_id: selectedMapelAkademik,
            };

            const url = editKategoriId
                ? `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kategori/${editKategoriId}`
                : `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kategori`;

            const res = await fetch(url, {
                method: editKategoriId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert(editKategoriId ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan');
                closeEditKategori();

                const reloadRes = await fetch(
                    `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kategori?mapel_id=${selectedMapelAkademik}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await reloadRes.json();
                setKategoriList(data.data || []);
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal menyimpan kategori');
            }
        } catch (err: any) {
            alert('Gagal menyimpan: ' + err.message);
        }
    };

    const handleDeleteKategori = async (id: number) => {
        if (!confirm('Hapus kategori ini?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/kategori/${id}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.ok) {
                setKategoriList(kategoriList.filter((k) => k.id !== id));
                alert('Kategori berhasil dihapus');
            } else {
                alert('Gagal menghapus kategori');
            }
        } catch (err) {
            alert('Gagal menghubungi server');
        }
    };

    const isPTSActive = jenisPenilaianAktif === 'PTS';

    const handleBobotChange = (komponenId: number, value: string) => {
        const newValue = parseFloat(value) || 0;
        setBobotList((prev) =>
            prev.map((b) => (b.komponen_id === komponenId ? { ...b, bobot: newValue } : b))
        );
    };

    const handleSaveBobot = async () => {
        if (!selectedMapelId) return;

        const isUnchanged = bobotList.every((b) => {
            const initial = initialBobotListRef.current.find((i) => i.komponen_id === b.komponen_id);
            return initial && Math.abs(b.bobot - initial.bobot) < 0.01;
        });

        if (isUnchanged) {
            alert('Tidak ada perubahan data.');
            return;
        }

        const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
        if (Math.abs(total - 100) > 0.1) {
            alert('Total bobot harus 100%');
            return;
        }

        if (isPTSActive) {
            const ptsKomponenIds = komponenList
                .filter((k) => /^PTS$/i.test(k.nama_komponen))
                .map((k) => k.id_komponen);
            const adaNonPTS = bobotList.some((b) => !ptsKomponenIds.includes(b.komponen_id) && b.bobot > 0);
            if (adaNonPTS) {
                alert('Di periode PTS, hanya bobot PTS yang boleh diisi. Harap atur bobot UH dan PAS menjadi 0.');
                return;
            }
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `http://localhost:5000/api/guru-bidang-studi/atur-penilaian/bobot/${selectedMapelId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(bobotList),
                }
            );

            if (res.ok) {
                alert('Bobot penilaian berhasil disimpan');
                initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal menyimpan bobot');
            }
        } catch (err) {
            alert('Gagal menyimpan bobot');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Memuat data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Atur Penilaian</h1>

                <div className="flex border-b border-gray-200 mb-6 gap-2">
                    <button
                        className={`px-3 py-2 sm:px-4 sm:py-2 font-medium text-xs sm:text-sm ${activeTab === 'akademik'
                                ? 'text-orange-600 border-b-2 border-orange-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('akademik')}
                    >
                        Kategori Akademik
                    </button>
                    <button
                        className={`px-3 py-2 sm:px-4 sm:py-2 font-medium text-xs sm:text-sm ${activeTab === 'bobot'
                                ? 'text-orange-600 border-b-2 border-orange-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab('bobot')}
                    >
                        Atur Bobot Penilaian
                    </button>
                </div>

                {activeTab === 'akademik' ? (
                    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Kategori Nilai Akademik</h2>
                            <div className="max-w-xs">
                                <select
                                    value={selectedMapelAkademik || ''}
                                    onChange={(e) =>
                                        setSelectedMapelAkademik(e.target.value ? Number(e.target.value) : null)
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelList
                                        .filter((mapel) => mapel.jenis === 'pilihan')
                                        .map((mapel) => (
                                            <option
                                                key={mapel.mata_pelajaran_id}
                                                value={mapel.mata_pelajaran_id}
                                            >
                                                {mapel.nama_mapel || 'Nama tidak tersedia'} ({mapel.jenis})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {selectedMapelAkademik ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => openEditKategori()}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2 text-xs sm:text-sm"
                                    >
                                        <Plus size={14} />
                                        Tambah Kategori
                                    </button>
                                </div>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full min-w-[600px] table-auto text-xs sm:text-sm">
                                        <thead>
                                            <tr>
                                                <th className="px-2 py-2 sm:px-3 sm:py-3 text-center bg-gray-800 text-white font-semibold">
                                                    Range Nilai
                                                </th>
                                                <th className="px-2 py-2 sm:px-3 sm:py-3 text-center bg-gray-800 text-white font-semibold">
                                                    Deskripsi
                                                </th>
                                                <th className="px-2 py-2 sm:px-3 sm:py-3 text-center bg-gray-800 text-white font-semibold">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kategoriList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-4 sm:px-4 sm:py-6 text-center text-gray-500">
                                                        Belum ada kategori untuk mata pelajaran ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                kategoriList.map((kategori) => (
                                                    <tr key={kategori.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-2 py-2 sm:px-3 sm:py-3 text-center text-xs sm:text-sm">
                                                            {Math.floor(kategori.min_nilai)} – {Math.floor(kategori.max_nilai)}
                                                        </td>
                                                        <td
                                                            className="px-2 py-2 sm:px-3 sm:py-3 text-center max-w-[200px] truncate"
                                                            title={kategori.deskripsi}
                                                        >
                                                            {kategori.deskripsi}
                                                        </td>
                                                        <td className="px-2 py-2 sm:px-3 sm:py-3 text-center">
                                                            <div className="flex justify-center gap-1 sm:gap-2">
                                                                <button
                                                                    onClick={() => openEditKategori(kategori)}
                                                                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 py-1 rounded flex items-center gap-1 text-xs"
                                                                >
                                                                    <Pencil size={12} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteKategori(kategori.id)}
                                                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    Hapus
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 bg-yellow-50 rounded-lg border border-dashed border-yellow-300">
                                <p className="text-gray-700 text-lg font-medium">
                                    Silakan pilih Mata Pelajaran terlebih dahulu.
                                </p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'bobot' ? (
                    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Atur Bobot Penilaian</h2>
                            <div className="max-w-xs">
                                <select
                                    value={selectedMapelId || ''}
                                    onChange={(e) =>
                                        setSelectedMapelId(e.target.value ? Number(e.target.value) : null)
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {mapelList
                                        .filter((mapel) => mapel.jenis === 'pilihan')
                                        .map((mapel) => (
                                            <option
                                                key={mapel.mata_pelajaran_id}
                                                value={mapel.mata_pelajaran_id}
                                            >
                                                {mapel.nama_mapel || 'Nama tidak tersedia'} ({mapel.jenis})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {selectedMapelId ? (
                            bobotLoading ? (
                                <div className="text-gray-500 text-xs sm:text-sm">Memuat bobot...</div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4">
                                    {isPTSActive && (
                                        <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded text-sm text-orange-800">
                                            <strong>ℹ️ Periode PTS Aktif</strong>
                                            <br />
                                            Sistem otomatis menetapkan: <strong>PTS = 100%</strong>.
                                            <br />
                                            Anda <strong>tidak perlu mengatur bobot manual</strong>.
                                        </div>
                                    )}
                                    {bobotList.map((bobot) => {
                                        const komponen = komponenList.find((k) => k.id_komponen === bobot.komponen_id);
                                        const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
                                        const isEditable = !isPTSActive || isPTS;

                                        return (
                                            <div
                                                key={bobot.komponen_id}
                                                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded"
                                            >
                                                <span className="font-medium min-w-[100px] text-xs sm:text-sm">
                                                    {komponen?.nama_komponen || 'Komponen'}
                                                </span>
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={isPTSActive && !isPTS ? 0 : bobot.bobot}
                                                        onChange={(e) => {
                                                            if (isEditable) {
                                                                handleBobotChange(bobot.komponen_id, e.target.value);
                                                            }
                                                        }}
                                                        disabled={!isEditable}
                                                        className={`w-full sm:w-20 border rounded px-2 py-1 text-xs sm:text-sm ${!isEditable
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                                                                : 'border-gray-300'
                                                            }`}
                                                    />
                                                    <span className="text-gray-600 text-xs sm:text-sm">%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-3 sm:pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-xs sm:text-sm">Total Bobot:</span>
                                            <span
                                                className={`text-sm sm:text-lg font-bold ${Math.abs(bobotList.reduce((sum, b) => sum + b.bobot, 0) - 100) < 0.1
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}
                                            >
                                                {bobotList.reduce((sum, b) => sum + b.bobot, 0).toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                    {!isPTSActive && (
                                        <div className="flex justify-end mt-3 sm:mt-6">
                                            <button
                                                onClick={handleSaveBobot}
                                                className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-xs sm:text-sm"
                                            >
                                                Simpan Bobot
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="text-center py-12 bg-yellow-50 rounded-lg border border-dashed border-yellow-300">
                                <p className="text-gray-700 text-lg font-medium">
                                    Silakan pilih Mata Pelajaran terlebih dahulu.
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Modal Edit Kategori */}
            {showEditKategori && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${editKategoriClosing ? 'opacity-0' : 'opacity-100'
                        } p-2`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeEditKategori();
                    }}
                >
                    <div className="absolute inset-0 bg-gray-900/70 pointer-events-none"></div>
                    <div
                        className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${editKategoriClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                        style={{ pointerEvents: 'auto' }}
                    >
                        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editKategoriId ? 'Edit Kategori' : 'Tambah Kategori'}
                            </h2>
                            <button
                                onClick={closeEditKategori}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Tutup"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Min</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editKategoriData.min_nilai}
                                        onChange={(e) =>
                                            setEditKategoriData({ ...editKategoriData, min_nilai: Number(e.target.value) })
                                        }
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Max</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editKategoriData.max_nilai}
                                        onChange={(e) =>
                                            setEditKategoriData({ ...editKategoriData, max_nilai: Number(e.target.value) })
                                        }
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                <textarea
                                    value={editKategoriData.deskripsi}
                                    onChange={(e) =>
                                        setEditKategoriData({ ...editKategoriData, deskripsi: e.target.value })
                                    }
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    rows={3}
                                    placeholder="Contoh: Sangat Baik, Perlu Bimbingan, dll."
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={closeEditKategori}
                                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveKategori}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
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