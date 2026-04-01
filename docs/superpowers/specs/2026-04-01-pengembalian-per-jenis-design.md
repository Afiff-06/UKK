# Pengembalian Per Jenis Barang Design

## Ringkasan

Desain ini mengubah alur pengembalian supaya satu transaksi peminjaman yang berisi beberapa jenis barang bisa diproses kembali per jenis barang. Pengguna dapat mengajukan pengembalian untuk sebagian item terlebih dahulu, lalu admin atau operator memverifikasi item tersebut satu per satu tanpa harus menyelesaikan seluruh transaksi sekaligus.

## Tujuan

- Mendukung pengajuan pengembalian per jenis barang dalam satu transaksi
- Mendukung verifikasi pengembalian per jenis barang di menu pengembalian
- Mengembalikan stok hanya untuk item yang benar-benar sudah diverifikasi
- Menjaga status transaksi induk tetap konsisten dengan status detail pengembaliannya

## Bukan Tujuan

- Mengubah alur persetujuan peminjaman
- Menambah tabel baru untuk pengembalian
- Mengubah struktur inventaris atau laporan di luar kebutuhan status pengembalian

## Kondisi Saat Ini

- Pengajuan pengembalian di [`app/pegawai/pengembalian/form/page.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/pegawai/pengembalian/form/page.tsx) masih memilih seluruh transaksi
- Konfirmasi pengembalian di [`app/admin/pengembalian/page.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/admin/pengembalian/page.tsx) dan [`app/operator/pengembalian/page.tsx`](/d:/Tugas%20MPKK/UKK/apip/UKK/app/operator/pengembalian/page.tsx) masih mengembalikan semua detail sekaligus
- Status pengembalian hanya disimpan di level `peminjaman`, jadi sistem tidak tahu jenis barang mana yang sudah diajukan atau diverifikasi

## Model Data

Tambahkan status pengembalian pada setiap baris `detail_peminjaman`:

- `status_pengembalian text not null default 'dipinjam'`
- `diajukan_pengembalian_pada timestamptz null`
- `dikonfirmasi_pengembalian_pada timestamptz null`

Nilai `status_pengembalian`:

- `dipinjam`
- `konfirmasi_pengembalian`
- `dikembalikan`

Backfill data lama:

- parent `konfirmasi_pengembalian` -> semua detail `konfirmasi_pengembalian`
- parent `dikembalikan` atau `terlambat` -> semua detail `dikembalikan`
- status lain -> semua detail `dipinjam`

## Aturan Status

Status `peminjaman` induk dihitung dari seluruh detail:

- jika semua detail `dikembalikan` -> `dikembalikan` atau `terlambat` berdasarkan jatuh tempo
- jika ada detail `konfirmasi_pengembalian` -> `konfirmasi_pengembalian`
- selain itu -> `dipinjam`

## Alur Pengguna

### Peminjam

- Form pengembalian menampilkan detail barang per jenis
- Peminjam hanya bisa memilih detail dengan status `dipinjam`
- Saat diajukan, hanya detail terpilih yang berubah ke `konfirmasi_pengembalian`

### Admin dan Operator

- Menu pengembalian tetap menampilkan daftar transaksi
- Di dalam setiap transaksi, tiap jenis barang memiliki badge status sendiri
- Tombol konfirmasi tersedia per detail, bukan per transaksi
- Saat dikonfirmasi, hanya stok item itu yang ditambah kembali

## Tampilan

- Riwayat pengembalian peminjam menampilkan status per jenis barang agar transaksi campuran tetap jelas
- Operator di halaman daftar peminjaman tidak lagi boleh menyelesaikan pengembalian seluruh transaksi dari satu tombol massal; aksi diarahkan ke menu pengembalian

## Error Handling

- Detail yang sudah `konfirmasi_pengembalian` atau `dikembalikan` tidak bisa diajukan ulang
- Detail yang sudah `dikembalikan` tidak bisa dikonfirmasi ulang
- Jika update stok gagal, detail tidak boleh ditandai selesai

## Testing

- Helper penentu status parent dari status detail
- Helper izin aksi per-detail
- Verifikasi lint untuk halaman yang diubah
- Build aplikasi
