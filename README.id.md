# E-Rapor SDIT Ulil Albab Batam — Sistem Informasi Manajemen Rapor Siswa Berbasis Web

E-Rapor SDIT Ulil Albab Batam adalah sistem informasi berbasis web yang dikembangkan untuk mendukung pengelolaan rapor siswa secara digital. Aplikasi ini membantu sekolah dalam mengelola data akademik, penugasan guru, penilaian siswa, absensi, kegiatan ekstrakurikuler, pembuatan rapor, dan pengarsipan rapor dalam satu sistem terpadu.

Aplikasi ini dikembangkan sebagai bagian dari mata kuliah **Project-Based Learning (PBL)** pada program studi **D3 Teknik Informatika**, Politeknik Negeri Batam.

---

# Latar Belakang

Pengelolaan rapor siswa di banyak sekolah dasar masih dilakukan secara manual atau semi-digital, sehingga menyebabkan kerja yang berulang, data yang tidak konsisten, dan proses pembuatan rapor yang kurang efisien. Proses administrasi seperti penugasan guru, input penilaian, pencatatan absensi, pengelolaan ekstrakurikuler, dan pembuatan rapor membutuhkan sistem terpusat yang akurat, aman, dan mudah digunakan.

E-Rapor SDIT Ulil Albab Batam dikembangkan untuk mendigitalisasi proses administrasi akademik tersebut melalui sebuah sistem informasi berbasis web terintegrasi. Aplikasi ini memungkinkan admin, guru kelas, dan guru bidang studi untuk berkolaborasi dalam satu platform, memastikan pembuatan rapor menjadi lebih cepat, efisien, dan meminimalkan kesalahan entri data.

---

# Fitur Utama

## Admin

- Autentikasi (Login & Logout)
- Dashboard
- Manajemen Tahun Ajaran
- Manajemen Administrator
- Manajemen Guru
- Manajemen Siswa
- Manajemen Kelas
- Manajemen Mata Pelajaran
- Manajemen Penugasan Mengajar
- Penugasan Guru Kelas
- Manajemen Ekstrakurikuler
- Penugasan Pembina Ekstrakurikuler
- Manajemen Profil Sekolah
- Manajemen Arsip rapor
- Backup & Restore Database

---

## Guru Kelas

- Dashboard
- Konfigurasi Penilaian
- Manajemen Absensi Siswa
- Manajemen Nilai Mata Pelajaran
- Penilaian Kokurikuler
- Penilaian Ekstrakurikuler
- Catatan Wali Kelas
- Pratinjau rapor Siswa
- Pembuatan rapor Siswa

---

## Guru Bidang Studi

- Dashboard
- Konfigurasi Penilaian
- Manajemen Nilai Siswa
- Monitoring Kemajuan Pembelajaran

---

# Teknologi

| Kategori | Teknologi |
|----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend  | Express.js 5, Node.js |
| Database | MariaDB |
| Styling  | Tailwind CSS 4 |
| Autentikasi | JSON Web Token (JWT) |
| Version Control | Git & GitHub |
| Alat Pengembangan | Visual Studio Code, Postman |

---

# Metode Pengembangan

Proyek ini menerapkan metode **Agile Software Development**, yang menekankan pengembangan iteratif, kolaborasi antar anggota tim, dan perbaikan berkelanjutan sepanjang proses Project-Based Learning.

Proses pengembangan dimulai dengan **Analisis Kebutuhan**, di mana kebutuhan fungsional dan non-fungsional diidentifikasi berdasarkan alur kerja administrasi akademik di SDIT Ulil Albab Batam. Kebutuhan tersebut diterjemahkan ke desain basis data, arsitektur sistem, dan prototipe antarmuka pengguna pada fase **Desain Sistem**.

Fase implementasi dilakukan secara bertahap menggunakan **Next.js** untuk frontend, **Express.js** untuk layanan REST API backend, dan **MariaDB** sebagai sistem manajemen basis data relasional.

Kualitas sistem dievaluasi melalui pengujian fungsional dan non-fungsional untuk memastikan setiap fitur beroperasi sesuai kebutuhan pengguna. Setelah pengujian berhasil, aplikasi dideploy untuk demonstrasi dan evaluasi sebagai hasil akhir PBL.

---

# Kebutuhan Fungsional

Kebutuhan fungsional mendefinisikan kemampuan utama sistem E-Rapor dalam mendukung kegiatan administrasi akademik di SDIT Ulil Albab Batam. Aplikasi menyediakan fungsi berbeda berdasarkan peran pengguna untuk memastikan pengelolaan data akademik yang efisien dan aman.

| Kode | Keterangan | Aktor |
|----|-----------|----------------|
| FR-01 | Melakukan Login dan Logout | Semua Pengguna |
| FR-02 | Edit Profil Pengguna | Semua Pengguna |
| FR-03 | Ubah Kata Sandi | Semua Pengguna |
| FR-04 | Tambah Tahun Ajaran | Admin |
| FR-05 | Ganti Semester di Tahun Ajaran | Admin |
| FR-06 | Melihat Detail Informasi Data Guru | Admin |
| FR-07 | Menambah Data Guru | Admin |
| FR-08 | Mengedit Data Guru | Admin |
| FR-09 | Import Data Guru | Admin |
| FR-10 | Filter Data Guru | Admin |
| FR-11 | Mengatur Kelas dan Guru Kelas | Admin |
| FR-12 | Atur Data Mata Pelajaran | Admin |
| FR-13 | Atur Data Pembelajaran | Admin |
| FR-14 | Kelola Status Penilaian | Admin |
| FR-15 | Melihat Detail Informasi Data Siswa | Admin |
| FR-16 | Menambah Data Siswa | Admin |
| FR-17 | Mengedit Data Siswa | Admin |
| FR-18 | Import Data Siswa | Admin |
| FR-19 | Tambah Data Pembina Ektrakurikuler | Admin |
| FR-20 | Import Data Pembina Ekstrakurikuler | Admin |
| FR-21 | Edit Data Pembina Ekstrakurikuler | Admin |
| FR-22 | Kelola Data Ekstrakurikuler | Admin |
| FR-23 | Melihat Detail Informasi Data Admin | Admin |
| FR-24 | Menambah Data Admin | Admin |
| FR-25 | Mengedit Data Admin | Admin |
| FR-26 | Mengisi Data Sekolah | Admin |
| FR-27 | Aktifkan Penilaian yang akan Dilaksanakan | Admin |
| FR-28 | Arsip Rapor | Admin |
| FR-29 | Backup & Restore Data Rapor | Admin |
| FR-30 | Mengatur Penilaian (Kokurikulerm Deskripsi Rata-Rata, Akademik, dan Bobot) | Guru Kelas |
| FR-31 | Melihat Data Siswa | Guru Kelas |
| FR-32 | Input Nilai Siswa (Mapel Wajib) | Guru Kelas |
| FR-33 | Input Penilaian Kokurikuler | Guru Kelas |
| FR-34 | Kelola Absensi Siswa | Guru Kelas |
| FR-35 | Input Catatan Wali Kelas | Guru Kelas |
| FR-36 | Kelola Ekstrakurikuler Siswa | Guru Kelas |
| FR-37 | Cetak/Unduh Rapor Siswa | Guru Kelas |
| FR-38 | Rekapan Nilai Rapor | Guru Kelas |
| FR-39 | Mengatur Penilaian Akademik | Guru Bidang Studi |
| FR-40 | Menginput Nilai (Mapel Pilihan) | Guru Bidang Studi |


---

# Kebutuhan Non-Fungsional

Kebutuhan non-fungsional mendefinisikan atribut kualitas yang memastikan sistem E-Rapor beroperasi efisien, aman, dan handal dalam kegiatan akademik sehari-hari.

| Kode | Keterangan | 
|----|----------|
| NFR-01 | Sistem harus mempertahankan rata-rata waktu respons tidak lebih dari **3 detik** dalam kondisi operasi normal. |
| NFR-02 | Kata sandi dienkripsi menggunakan mekanisme hashing, sementara akses API diamankan menggunakan autentikasi **JSON Web Token (JWT)**. |
| NFR-03 | Akses ke data akademik dibatasi berdasarkan peran pengguna (Administrator, Wali Kelas, Guru Mata Pelajaran). |
| NFR-04 | Antarmuka dirancang intuitif dan mudah dipelajari oleh staf sekolah dengan pelatihan minimal. |
| NFR-05 | Aplikasi mempertahankan tampilan antarmuka yang konsisten di seluruh modul dan peran pengguna. |
| NFR-06 | Sistem kompatibel dengan browser modern seperti Google Chrome, Microsoft Edge, Mozilla Firefox, dan Safari. |
| NFR-07 | Sistem dirancang untuk mendukung hingga **100 pengguna konkuren** tanpa degradasi performa signifikan. |
| NFR-08 | Rekam akademik siswa dan data penilaian dipertahankan konsisten tanpa duplikasi. |
| NFR-09 | Disediakan mekanisme backup dan restore untuk memastikan ketersediaan dan pemulihan data. |
| NFR-10 | Sistem memberikan pesan kesalahan yang jelas dan informatif alih-alih menampilkan exception teknis. |

---

# Arsitektur Sistem

Aplikasi mengikuti arsitektur tiga lapis yang terdiri dari lapisan presentasi, lapisan aplikasi, dan lapisan basis data.

```text
+----------------------+ 
|      Frontend        |
|  Next.js + React.js  |
+----------+-----------+
           |
           | REST API
           |
+----------v-----------+
|      Backend         |
| Express.js + Node.js |
+----------+-----------+
           |
           |
+----------v-----------+
|      MariaDB         |
| Relational Database  |
+----------------------+ 
```

---

# Basis Data

Aplikasi menggunakan **MariaDB** sebagai sistem manajemen basis data relasional utama.

Beberapa entitas utama meliputi:

- Administrator
- Guru
- Siswa
- Kelas
- Mata Pelajaran
- Penugasan Mengajar
- Tahun Ajaran
- Absensi
- Penilaian Siswa
- Penilaian Kokurikuler
- Penilaian Ekstrakurikuler
- Catatan Wali Kelas
- Arsip rapor

Basis data dirancang menggunakan tabel relasional dengan primary key dan foreign key untuk menjaga konsistensi dan integritas data di seluruh sistem.

---

# Panduan Instalasi

## Prasyarat

Sebelum menjalankan proyek, pastikan perangkat lunak berikut terpasang di komputer Anda:

- Node.js (v18 atau lebih baru)
- MariaDB
- Git
- Visual Studio Code (direkomendasikan)

---

## Clone Repository

```bash
git clone https://github.com/Raid1542/E-Rapor.git
cd E-Rapor
```

---

## Instalasi Backend

```bash
cd server
npm install
```

Konfigurasikan koneksi basis data dengan mengedit file `.env`.

Contoh:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=erapor_db

JWT_SECRET=your_secret_key
PORT=5000
```

Jalankan server backend:

```bash
npm start
```

atau menggunakan PM2

```bash
pm2 start server.js --name erapor
```

Server backend akan berjalan di:

```
http://localhost:5000
```

---

## Instalasi Frontend

Buka terminal baru.

```bash
cd klien
npm install
npm run dev
```

Aplikasi frontend akan berjalan di:

```
http://localhost:3000
```

---

## Basis Data

Buat database MariaDB dengan nama:

```
erapor_db
```

Impor file database SQL sebelum menjalankan aplikasi.

---

# Dokumentasi

Dokumentasi proyek lengkap dapat diakses melalui tautan berikut.

| Dokumen | Tautan |
|---------|--------|
| 📄 File Lengkap | https://drive.google.com/drive/folders/1WUbDMMhyndlvOXV16d4t670WnA5f_YIL?usp=sharing |
| 🎥 Video Demo | https://www.youtube.com/watch?v=pmvVWjnRKTA |
| 🎬 Video Presentasi | https://www.youtube.com/watch?v=0hRU_DxJIYA |

---

# Tim Pengembang

Project-Based Learning (PBL)

D3 Teknik Informatika

| Nama | Peran |
|------|-------|
| Raid Aqil Athallah - 3312401022 | Fullstack |
| Frima Rizky Lianda - 3312401016 | Fullstack |

---

# Lisensi

Proyek ini dikembangkan untuk keperluan pendidikan sebagai bagian dari mata kuliah **Project-Based Learning (PBL)** pada program studi **D3 Teknik Informatika, Politeknik Negeri Batam**.

© 2026 E-Rapor SDIT Ulil Albab Batam. Dikembangkan oleh Raid Aqil Athallah dan Frima Rizky Lianda, Politeknik Negeri Batam.
