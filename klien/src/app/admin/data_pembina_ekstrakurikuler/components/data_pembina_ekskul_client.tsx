/**
 * Nama File: data_pembina_ekskul_client.tsx
 * Fungsi: Komponen klien untuk mengelola data pribadi pembina ekstrakurikuler,
 *         mencakup fitur tambah, edit, detail, import Excel,
 *         pencarian, dan pagination.
 *         Catatan: Data nama pembina di sini akan digunakan sebagai relasi
 *         pada halaman manajemen ekstrakurikuler.
 * Pembuat: [Nama Pembuat] - NIM: [NIM]
 * Tanggal: [Tanggal]
 */

'use client';

import { useState, useEffect, ChangeEvent, ReactNode } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search } from 'lucide-react';

// =============================================
// INTERFACES
// =============================================

interface PembinaEkskul {
  id: number;
  nama: string;
  niy?: string;
  nuptk?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenisKelamin?: string;
  alamat?: string;
  no_telepon?: string;
  statusPembina?: string;
  profileImage?: string;
}

interface FormDataType {
  nama: string;
  niy: string;
  nuptk: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  no_telepon: string;
  statusPembina: string;
  confirmData: boolean;
}

// =============================================
// HELPERS
// =============================================

const formatTanggalIndonesia = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const hari = date.getDate();
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][date.getMonth()];
  const tahun = date.getFullYear();
  return `${hari} ${bulan} ${tahun}`;
};

// =============================================
// MAIN COMPONENT
// =============================================

export default function DataPembinaEkskulClient() {
  const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
    if (s === 'perempuan' || s === 'p') return 'Perempuan';
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  };

  // === State Utama ===
  const [pembinaList, setPembinaList] = useState<PembinaEkskul[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedPembina, setSelectedPembina] = useState<PembinaEkskul | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [importClosing, setImportClosing] = useState(false);

  // === Fetch Pembina ===
  const fetchPembina = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Silakan login terlebih dahulu');
        return;
      }
      const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data.data)
          ? data.data.map((p: any) => {
              let normalizedStatus = 'aktif';
              if (typeof p.status === 'string') {
                normalizedStatus = p.status.trim().toLowerCase();
                if (normalizedStatus !== 'aktif') normalizedStatus = 'nonaktif';
              }
              return {
                id: p.id_user || p.id,
                nama: p.nama_lengkap || p.nama,
                niy: p.niy,
                nuptk: p.nuptk,
                tempat_lahir: p.tempat_lahir || '',
                tanggal_lahir: p.tanggal_lahir || '',
                jenisKelamin: p.jenis_kelamin || '',
                alamat: p.alamat || '',
                no_telepon: p.no_telepon || '',
                statusPembina: normalizedStatus,
                profileImage: p.profileImage || null,
              };
            })
          : [];
        setPembinaList(list);
      } else {
        alert('Gagal memuat data pembina: ' + (data.message || 'Error tidak diketahui'));
      }
    } catch (err) {
      console.error('Error fetch pembina:', err);
      alert('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPembina();
  }, []);

  // === Form State ===
  const [formData, setFormData] = useState<FormDataType>({
    nama: '',
    niy: '',
    nuptk: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: '',
    alamat: '',
    no_telepon: '',
    statusPembina: 'aktif',
    confirmData: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDetail = (pembina: PembinaEkskul) => {
    setSelectedPembina(pembina);
    setShowDetail(true);
  };

  const handleEdit = (pembina: PembinaEkskul) => {
    setEditId(pembina.id);
    setFormData({
      nama: pembina.nama || '',
      niy: pembina.niy || '',
      nuptk: pembina.nuptk || '',
      tempatLahir: pembina.tempat_lahir || '',
      tanggalLahir: pembina.tanggal_lahir || '',
      jenisKelamin: pembina.jenisKelamin || '',
      alamat: pembina.alamat || '',
      no_telepon: pembina.no_telepon || '',
      statusPembina: pembina.statusPembina === 'aktif' ? 'aktif' : 'nonaktif',
      confirmData: false,
    });
    setShowEdit(true);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // === Validasi ===
  const validate = (isEdit: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nama?.trim()) newErrors.nama = 'Nama wajib diisi';
    if (!formData.jenisKelamin) newErrors.jenisKelamin = 'Pilih jenis kelamin';
    if (!formData.tanggalLahir) {
      newErrors.tanggalLahir = 'Tanggal lahir wajib diisi';
    } else {
      const dob = new Date(formData.tanggalLahir);
      if (isNaN(dob.getTime())) {
        newErrors.tanggalLahir = 'Tanggal lahir tidak valid';
      } else {
        const today = new Date();
        if (dob > today) {
          newErrors.tanggalLahir = 'Tanggal lahir tidak boleh di masa depan';
        } else {
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (age < 18) newErrors.tanggalLahir = 'Usia minimal 18 tahun';
        }
      }
    }
    if (isEdit && (!formData.statusPembina || formData.statusPembina === '')) {
      newErrors.statusPembina = 'Status wajib dipilih';
    }
    if (!formData.confirmData) newErrors.confirmData = 'Harap konfirmasi data sebelum melanjutkan';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === Submit Tambah ===
  const handleSubmitTambah = async () => {
    if (!validate(false)) return;
    const token = localStorage.getItem('token');
    if (!token) { alert('Sesi login habis. Silakan login ulang.'); return; }
    try {
      const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama,
          niy: formData.niy,
          nuptk: formData.nuptk,
          tempat_lahir: formData.tempatLahir,
          tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin,
          alamat: formData.alamat,
          no_telepon: formData.no_telepon,
        }),
      });
      if (res.ok) {
        alert('Data pembina berhasil ditambahkan');
        setShowTambah(false);
        fetchPembina();
        handleReset();
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal menambah data pembina');
      }
    } catch { alert('Gagal terhubung ke server'); }
  };

  // === Submit Edit ===
  const handleSubmitEdit = async () => {
    const originalData = pembinaList.find((p) => p.id === editId);
    if (!originalData) return;
    const normalize = (str?: string | null) => (str || '').trim().toLowerCase();
    const hasChanged =
      formData.nama !== (originalData.nama || '') ||
      formData.niy !== (originalData.niy || '') ||
      formData.nuptk !== (originalData.nuptk || '') ||
      formData.tempatLahir !== (originalData.tempat_lahir || '') ||
      formData.tanggalLahir !== (originalData.tanggal_lahir || '') ||
      normalize(formData.jenisKelamin) !== normalize(originalData.jenisKelamin) ||
      formData.alamat !== (originalData.alamat || '') ||
      formData.no_telepon !== (originalData.no_telepon || '') ||
      formData.statusPembina !== (originalData.statusPembina || 'aktif');

    if (!hasChanged) { alert('Tidak ada perubahan data.'); return; }
    if (!validate(true)) return;
    const token = localStorage.getItem('token');
    if (!token) { alert('Sesi login habis.'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/pembina-ekskul/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama,
          niy: formData.niy,
          nuptk: formData.nuptk,
          tempat_lahir: formData.tempatLahir,
          tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin,
          alamat: formData.alamat,
          no_telepon: formData.no_telepon,
          status: formData.statusPembina,
        }),
      });
      if (res.ok) {
        alert('Data pembina berhasil diperbarui');
        setShowEdit(false);
        setEditId(null);
        fetchPembina();
        handleReset();
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal memperbarui data pembina');
      }
    } catch { alert('Gagal terhubung ke server'); }
  };

  const handleReset = () => {
    setFormData({
      nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
      jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif', confirmData: false,
    });
    setErrors({});
  };

  // === Import Excel ===
  const handleImportExcel = async () => {
    if (!importFile) { alert('Pilih file Excel dulu.'); return; }
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Berhasil import ${result.total} data pembina!`);
        setShowImport(false);
        setImportFile(null);
        fetchPembina();
      } else {
        alert('Gagal: ' + (result.message || 'Gagal import data pembina'));
      }
    } catch { alert('Gagal terhubung ke server'); }
  };

  // === Pencarian & Pagination ===
  const filteredPembina = pembinaList.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.nama?.toLowerCase().includes(q) ||
      p.niy?.includes(q) ||
      p.nuptk?.includes(q) ||
      p.tempat_lahir?.toLowerCase().includes(q) ||
      p.no_telepon?.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredPembina.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPembina = filteredPembina.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    if (currentPage > 1)
      pages.push(
        <button key="prev" onClick={() => setCurrentPage((c) => c - 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">«</button>
      );
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++)
        pages.push(
          <button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{i}</button>
        );
    } else {
      pages.push(
        <button key={1} onClick={() => setCurrentPage(1)} className={`px-3 py-1 border border-gray-300 rounded ${currentPage === 1 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>1</button>
      );
      if (currentPage > 3) pages.push(<span key="d1" className="px-2 text-gray-600">...</span>);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
        pages.push(
          <button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border border-gray-300 rounded ${currentPage === i ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{i}</button>
        );
      if (currentPage < totalPages - 2) pages.push(<span key="d2" className="px-2 text-gray-600">...</span>);
      pages.push(
        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1 border border-gray-300 rounded ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>{totalPages}</button>
      );
    }
    if (currentPage < totalPages)
      pages.push(
        <button key="next" onClick={() => setCurrentPage((c) => c + 1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">»</button>
      );
    return pages;
  };

  // === Close Modal Helpers ===
  const closeDetail = () => {
    setDetailClosing(true);
    setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
  };
  const closeImport = () => {
    setImportClosing(true);
    setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200);
  };

  // =============================================
  // RENDER FORM (Tambah / Edit)
  // =============================================

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
          Data Pembina Ekstrakurikuler
        </h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEdit ? 'Edit Data Pembina' : 'Tambah Data Pembina'}
            </h2>
            <button
              onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Nama */}
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

            {/* NIY */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">NIY</label>
              <input
                type="text"
                name="niy"
                value={formData.niy}
                onChange={handleInputChange}
                placeholder="Nomor Induk Yayasan"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
              />
            </div>

            {/* NUPTK */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">NUPTK</label>
              <input
                type="text"
                name="nuptk"
                value={formData.nuptk}
                onChange={handleInputChange}
                placeholder="Nomor Unik Pendidik"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
              />
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempat Lahir</label>
              <input
                type="text"
                name="tempatLahir"
                value={formData.tempatLahir}
                onChange={handleInputChange}
                placeholder="Misal: Jakarta"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggalLahir"
                value={formData.tanggalLahir}
                onChange={handleInputChange}
                className={`w-full border ${errors.tanggalLahir ? 'border-red-500' : 'border-gray-300'} rounded px-3 py-2`}
              />
              {errors.tanggalLahir && <p className="text-red-500 text-xs mt-1">{errors.tanggalLahir}</p>}
            </div>

            {/* Jenis Kelamin */}
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
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
              {errors.jenisKelamin && <p className="text-red-500 text-xs mt-1">{errors.jenisKelamin}</p>}
            </div>

            {/* Telepon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telepon</label>
              <input
                type="tel"
                name="no_telepon"
                value={formData.no_telepon}
                onChange={handleInputChange}
                placeholder="misal: 081234567890"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
              />
            </div>

            {/* Status (hanya saat edit) */}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status Pembina <span className="text-red-500">*</span>
                </label>
                <select
                  name="statusPembina"
                  value={formData.statusPembina}
                  onChange={handleInputChange}
                  className={`w-full border ${errors.statusPembina ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2.5`}
                >
                  <option value="">-- Pilih --</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
                {errors.statusPembina && <p className="text-red-500 text-xs mt-1">{errors.statusPembina}</p>}
              </div>
            )}

            {/* Alamat */}
            <div className={isEdit ? 'md:col-span-1' : 'md:col-span-2'}>
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

          {/* Konfirmasi */}
          <div className="mt-6">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="confirmData"
                checked={formData.confirmData}
                onChange={handleInputChange}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Saya yakin data yang diisi sudah benar</span>
            </label>
            {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
          </div>

          {/* Tombol */}
          <div className="mt-6 sm:mt-8">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
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

  // =============================================
  // RENDER TABEL UTAMA
  // =============================================

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Pembina Ekstrakurikuler</h1>
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">

          {/* Tombol Aksi */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <button
              onClick={() => setShowTambah(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} /> Tambah Pembina
            </button>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-gray-700 text-sm">Tampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              <button
                onClick={() => setShowImport(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Upload size={20} /> Import
              </button>
            </div>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
            <table className="w-full min-w-[600px] table-auto text-sm">
              <thead>
                <tr>
                  {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map((h) => (
                    <th key={h} className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                ) : currentPembina.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data pembina ekstrakurikuler</td></tr>
                ) : (
                  currentPembina.map((pembina, index) => (
                    <tr
                      key={pembina.id}
                      className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 align-middle font-medium">{pembina.nama}</td>
                      <td className="px-4 py-3 text-center align-middle">{formatGender(pembina.jenisKelamin)}</td>
                      <td className="px-4 py-3 text-center align-middle">{pembina.niy || '-'}</td>
                      <td className="px-4 py-3 text-center align-middle">{pembina.nuptk || '-'}</td>
                      <td className="px-4 py-3 text-center align-middle">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${pembina.statusPembina === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {pembina.statusPembina?.toUpperCase() || 'AKTIF'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                        <div className="flex justify-center gap-1 sm:gap-2">
                          <button
                            onClick={() => handleDetail(pembina)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm"
                          >
                            <Eye size={16} /><span className="hidden sm:inline">Detail</span>
                          </button>
                          <button
                            onClick={() => handleEdit(pembina)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm"
                          >
                            <Pencil size={16} /><span className="hidden sm:inline">Edit</span>
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
          <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
            <div className="text-sm text-gray-600">
              Menampilkan {filteredPembina.length === 0 ? 0 : startIndex + 1} -{' '}
              {Math.min(startIndex + itemsPerPage, filteredPembina.length)} dari {filteredPembina.length} data
            </div>
            <div className="flex gap-1 flex-wrap justify-center">{renderPagination()}</div>
          </div>
        </div>
      </div>

      {/* =============================================
          MODAL DETAIL
      ============================================= */}
      {showDetail && selectedPembina && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}
        >
          <div className="absolute inset-0 bg-gray-900/70" />
          <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detail Pembina</h2>
              <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700 flex-shrink-0"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 overflow-hidden mb-3 flex-shrink-0 flex items-center justify-center">
                  {selectedPembina.profileImage ? (
                    <img
                      src={`http://localhost:5000${selectedPembina.profileImage.startsWith('/') ? selectedPembina.profileImage : '/' + selectedPembina.profileImage}`}
                      alt="Foto Profil"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-gray-700 text-xl sm:text-2xl font-bold">
                      {selectedPembina.nama.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '??'}
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 text-center break-words">
                  {selectedPembina.nama}
                </h3>
              </div>

              {/* Info */}
              <div className="space-y-2 sm:space-y-3">
                {[
                  {
                    label: 'Status',
                    value: (
                      <span className={`inline-block px-3 py-1 rounded text-xs sm:text-sm font-medium ${selectedPembina.statusPembina === 'aktif' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {selectedPembina.statusPembina?.toUpperCase() || 'AKTIF'}
                      </span>
                    ),
                  },
                  { label: 'NIY', value: selectedPembina.niy || '-' },
                  { label: 'NUPTK', value: selectedPembina.nuptk || '-' },
                  { label: 'Jenis Kelamin', value: formatGender(selectedPembina.jenisKelamin) },
                  { label: 'Tempat Lahir', value: selectedPembina.tempat_lahir || '-' },
                  { label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedPembina.tanggal_lahir) },
                  { label: 'Telepon', value: selectedPembina.no_telepon || '-' },
                  { label: 'Alamat', value: selectedPembina.alamat || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b pb-2">
                    <span className="font-semibold text-xs sm:text-sm col-span-1">{label}</span>
                    <span className="text-xs sm:text-sm">:</span>
                    <span className="text-xs sm:text-sm col-span-1 sm:col-span-2 break-words">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button onClick={closeDetail} className="px-4 sm:px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-xs sm:text-sm font-medium">Tutup</button>
                <button
                  onClick={() => { handleEdit(selectedPembina); closeDetail(); }}
                  className="px-4 sm:px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded transition text-xs sm:text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================
          MODAL IMPORT EXCEL
      ============================================= */}
      {showImport && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
          onClick={(e) => { if (e.target === e.currentTarget) closeImport(); }}
        >
          <div className="absolute inset-0 bg-gray-900/70" />
          <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Import Data Pembina</h2>
              <button onClick={closeImport} className="text-gray-500 hover:text-gray-700" aria-label="Tutup modal"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-gray-600 mb-4">
                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
              </p>
              <div className="mb-4">
                <a
                  href="http://localhost:5000/templates/template_import_pembina_ekskul.xlsx"
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
                    {importFile
                      ? <span className="font-medium text-blue-600">{importFile.name}</span>
                      : 'Klik untuk pilih file'}
                  </p>
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleImportExcel}
                  disabled={!importFile}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition ${!importFile ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                >
                  Import
                </button>
                <button onClick={closeImport} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}