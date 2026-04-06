# LAPORAN INVENTARIS BARANG SEKOLAH (UKK)
**Membangun Sistem Manajemen Aset Berbasis Web dengan Next.js dan Supabase**

---

## BAB 1: PENDAHULUAN

### 1.1 Latar Belakang
Di era transformasi digital saat ini, efisiensi pengelolaan aset di lingkungan pendidikan, khususnya Sekolah Menengah Kejuruan (SMK), menjadi faktor krusial. SMK seringkali memiliki inventaris alat dan bahan praktik yang sangat beragam dan bernilai tinggi. Pengelolaan secara manual menggunakan buku besar atau spreadsheet sederhana seringkali menimbulkan kendala seperti:
- Ketidakakuratan data karena kesalahan input (human error).
- Sulitnya memantau status barang (tersedia, dipinjam, atau rusak) secara real-time.
- Risiko kehilangan data atau dokumen fisik yang rusak.
- Proses penyusunan laporan bulanan yang memakan waktu lama.

Oleh karena itu, diperlukan sebuah aplikasi "Inventaris Barang Sekolah" yang terintegrasi untuk mendigitalisasi proses pencatatan, peminjaman, serta pelaporan secara otomatis dan akurat.

### 1.2 Rumusan Masalah
Berdasarkan latar belakang di atas, rumusan masalah dalam pembangunan sistem ini adalah:
1. Bagaimana merancang sistem yang mampu mengelola data master (barang, ruang, jenis) dengan tertib?
2. Bagaimana mempermudah proses peminjaman dan pengembalian barang bagi pegawai (guru/siswa)?
3. Bagaimana memberikan akses kontrol yang tepat bagi Admin, Operator, dan Pegawai sesuai peran masing-masing?
4. Bagaimana menghasilkan laporan inventaris yang transparan dan siap cetak?

### 1.3 Tujuan
Tujuan dari pembuatan aplikasi ini adalah:
1. Membangun platform digital untuk pendataan aset sekolah secara terpusat.
2. Mengurangi risiko kehilangan barang melalui pelacakan (tracking) status peminjaman secara sistematis.
3. Mempercepat proses verifikasi peminjaman dan pengembalian oleh petugas (Admin/Operator).
4. Menyediakan fitur ekspor laporan (Excel/PDF) untuk keperluan manajemen sekolah.

---

## BAB 2: PEMBAHASAN

### 2.1 Pengelolaan Inventaris
Pengelolaan inventaris (Inventory Management) adalah proses yang melibatkan pencatatan, pengawasan, dan pemeliharaan aset fisik organisasi. Dalam konteks sekolah, hal ini mencakup:
- **Penerimaan Barang**: Registrasi barang baru beserta jumlah dan kondisinya.
- **Penyimpanan**: Penempatan barang pada ruang-ruang tertentu sesuai kategorinya.
- **Pemanfaatan**: Proses peminjaman barang oleh pengguna yang berhak.
- **Pemeliharaan**: Pemantauan kondisi barang (Baik, Rusak Ringan, Rusak Berat) setelah digunakan.

### 2.2 Aplikasi Inventaris Berbasis Website
Aplikasi ini dibangun menggunakan teknologi berbasis web modern untuk memastikan kemudahan akses dari berbagai perangkat tanpa perlu instalasi rumit. Keuntungan menggunakan aplikasi web meliputi:
- **Aksesibilitas**: Dapat diakses melalui browser kapan saja dan di mana saja.
- **Real-time**: Perubahan data (misal: stok berkurang setelah dipinjam) langsung terlihat oleh user lain.
- **Skalabilitas**: Sistem dapat dikembangkan lebih lanjut seiring bertambahnya jumlah aset sekolah.

### 2.3 Struktur Sistem Aplikasi (Tech Stack)
Aplikasi dikembangkan dengan menggunakan stack teknologi sebagai berikut:
- **Framework**: **Next.js (App Router)** - Untuk rendering yang cepat dan optimasi SEO.
- **Database & Auth**: **Supabase** - Sebagai backend-as-a-service yang menyediakan PostgreSQL dan otentikasi berbasis token.
- **Styling**: **Tailwind CSS** - Memberikan desain antarmuka (UI) yang modern, bersih, dan responsif.
- **Icons & UI Components**: **Lucide React** & **Radix UI** - Untuk elemen visual yang interaktif.
- **Alerts**: **SweetAlert2** - Untuk notifikasi konfirmasi yang lebih user-friendly.

---

## BAB 3: BASIS DATA

### 3.1 Perancangan Basis Data
Sistem ini menggunakan basis data relasional (PostgreSQL via Supabase) untuk menjaga integritas data. Hubungan antar entitas dirancang untuk meminimalkan redundansi data.

### 3.2 Data Flow Diagram (DFD)

#### A. Diagram Konteks (Level 0)
Sistem Inventaris berada di tengah, berinteraksi dengan tiga entitas eksternal:
1. **Admin**: Mengelola seluruh data master, pengguna, dan laporan.
2. **Operator**: Memverifikasi transaksi peminjaman/pengembalian dan mengelola stok fisik.
3. **Pegawai (Peminjam)**: Melakukan pengajuan pinjam barang, cek riwayat, dan update profil.

#### B. DFD Level 1
1. **Proses Login**: Validasi kredensial pengguna (Username/Password).
2. **Proses Olah Data Master**: Input, Edit, Hapus data `Ruang`, `Jenis`, dan `Inventaris`.
3. **Proses Transaksi**: Pengajuan pinjam, persetujuan petugas, dan pengembalian barang.
4. **Proses Pelaporan**: Penarikan data dari tabel transaksi untuk diunduh sebagai file eksternal.

### 3.3 Entity Relationship Diagram (ERD)
- **User (1) -- (<) Inventaris**: User (Admin/Petugas) meregistrasi atau mengelola banyak barang.
- **Jenis (1) -- (<) Inventaris**: Satu kategori (misal: Alat Elektronik) memiliki banyak barang.
- **Ruang (1) -- (<) Inventaris**: Satu ruangan (misal: Lab Komputer) menampung banyak barang.
- **User (1) -- (<) Peminjaman**: Satu pegawai dapat melakukan banyak pengajuan peminjaman.
- **Peminjaman (1) -- (1) Detail Peminjaman**: Setiap transaksi memiliki rincian barang yang dipinjam.

### 3.4 Struktur Tabel
Berikut adalah detail tabel utama dalam sistem:

| Nama Tabel | Deskripsi | Kolom Utama |
|---|---|---|
| `tb_user` | Menyimpan data akun dan profil | `id`, `username`, `password`, `nama`, `role` (Admin/Operator/Pegawai/Guru/Siswa), `nip/nisn` |
| `inventaris` | Menyimpan detail aset fisik | `id_inventaris`, `nama`, `kondisi`, `jumlah`, `id_jenis`, `id_ruang`, `kode_inventaris` |
| `peminjaman` | Menyimpan header transaksi | `id_peminjaman`, `id_pegawai`, `tanggal_pinjam`, `tanggal_kembali`, `status` (Pending/Dipinjam/Ditolak/Dikembalikan) |
| `detail_peminjaman` | Rincian barang dalam peminjaman | `id`, `id_peminjaman`, `id_inventaris`, `jumlah`, `status_pengembalian` |
| `ruang` | Lokasi penempatan barang | `id_ruang`, `nama_ruang`, `kode_ruang` |
| `jenis` | Kategori klasifikasi barang | `id_jenis`, `nama_jenis`, `kode_jenis` |

---

## BAB 4: MANUAL PENGGUNA

### 4.1 Alur Pengguna: Pegawai (Guru/Siswa)
1. **Login**: Masuk menggunakan akun yang telah diberikan oleh Admin.
2. **Dashboard**: Melihat ringkasan barang yang sedang dipinjam.
3. **Ajukan Peminjaman**: 
   - Masuk ke menu "Peminjaman" -> Klik "Ajukan Peminjaman".
   - Pilih barang dari daftar, masukkan jumlah, tanggal, dan jam peminjaman.
   - Klik "Kirim". Status akan menjadi **Pending**.
4. **Riwayat**: Memantau apakah pengajuan sudah disetujui atau ditolak (beserta alasannya).
5. **Pengembalian**: Jika sudah selesai digunakan, klik tombol "Kembalikan" untuk memberitahu petugas.

### 4.2 Alur Pengguna: Operator (Petugas)
1. **Dashboard**: Memantau statistik barang masuk/keluar.
2. **Manajemen Inventaris**: Melihat daftar stok barang yang tersedia di ruangan.
3. **Verifikasi Peminjaman**:
   - Jika ada pengajuan baru, berikan persetujuan (Approve) atau tolak (Reject) jika alasan tidak valid.
4. **Verifikasi Pengembalian**:
   - Menerima fisik barang, mengecek kondisi (Baik/Rusak), dan mengonfirmasi pengembalian di sistem agar stok kembali bertambah.

### 4.3 Alur Pengguna: Admin
1. **Kontrol Penuh**: Menjalankan semua fungsi Operator.
2. **Manajemen Pengguna**: Menambah akun baru (Pegawai baru atau Operator baru) dan mereset password.
3. **Setup Data Master**: Menambah/Menghapus data `Ruang` dan `Jenis` barang.
4. **Laporan**: Mengunduh laporan transaksi dalam range tanggal tertentu untuk diserahkan kepada pimpinan.

---

## BAB 5: PENUTUP

### 5.1 Kesimpulan
Sistem Inventaris Barang berbasis web ini telah berhasil diimplementasikan untuk menyediakan solusi manajemen aset yang modern. Dengan integrasi database real-time dan sistem otentikasi yang aman, sekolah dapat memantau penggunaan aset secara transparan dan akuntabel. Penggunaan Next.js dan Supabase terbukti memberikan performa aplikasi yang sangat cepat dan stabil.

### 5.2 Saran
Meskipun aplikasi sudah berjalan dengan baik, terdapat beberapa peluang pengembangan di masa depan:
- **Pindai QR Code**: Implementasi pencetakan label QR Code pada tiap barang untuk mempercepat proses peminjaman hanya dengan scan smartphone.
- **Notifikasi Push**: Mengirimkan pengingat otomatis ke email atau WhatsApp pengguna jika batas waktu pengembalian segera habis.
- **Audit Log**: Pencatatan riwayat perubahan data (audit trail) untuk keamanan tingkat lanjut.

---

## DAFTAR PUSTAKA
1. *Next.js Documentation*. (2025). "App Router and Server Actions". [nextjs.org/docs](https://nextjs.org/docs)
2. *Supabase Documentation*. (2025). "Database Relationships and Row Level Security". [supabase.com/docs](https://supabase.com/docs)
3. *MDN Web Docs*. (2024). "Using Fetch and Async Operations in JavaScript". 
4. *Undang-Undang Sistem Pendidikan Nasional*. (Referensi umum tata kelola aset lembaga).
