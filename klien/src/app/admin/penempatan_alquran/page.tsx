import PenempatanAlquranClient from "./components/penempatan_alquran_client";

export default function PenempatanAlquranPage() {
  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Penempatan Guru Al-Qur'an
        </h1>
        <p className="text-sm mt-1 text-gray-500">
          Atur kelompok dan penempatan siswa untuk guru Al-Qur'an.
        </p>
      </div>

      {/* Panggil komponen client di sini */}
      <PenempatanAlquranClient />
    </div>
  );
}
