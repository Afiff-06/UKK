# Pengembalian Per Jenis Barang Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah alur pengembalian agar pengajuan dan verifikasi dilakukan per jenis barang dalam satu transaksi peminjaman.

**Architecture:** Tambahkan status pengembalian di `detail_peminjaman`, hitung status `peminjaman` induk dari status-detail, lalu refactor UI pengembalian peminjam/admin/operator supaya aksi terjadi di level detail dan stok hanya kembali untuk item yang dikonfirmasi.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase PostgREST, node:test, ESLint

---

## File Structure

### Modify

- `lib/peminjaman-status.ts`
- `app/pegawai/pengembalian/form/page.tsx`
- `app/pegawai/pengembalian/page.tsx`
- `app/admin/pengembalian/page.tsx`
- `app/operator/pengembalian/page.tsx`
- `app/operator/peminjaman/page.tsx`

### Create

- `lib/return-workflow.ts`
- `tests/lib/return-workflow.test.ts`
- `supabase/migrations/20260401_detail_peminjaman_return_status.sql`

## Chunk 1: Shared return-status logic

### Task 1: TDD helper status parent

**Files:**
- Create: `tests/lib/return-workflow.test.ts`
- Create: `lib/return-workflow.ts`

- [ ] Write failing tests for status parent dan izin aksi detail
- [ ] Run `npm test -- tests/lib/return-workflow.test.ts` dan pastikan gagal
- [ ] Implement helper minimal di `lib/return-workflow.ts`
- [ ] Run `npm test -- tests/lib/return-workflow.test.ts` dan pastikan lulus

## Chunk 2: Database support

### Task 2: Tambahkan kolom status detail pengembalian

**Files:**
- Create: `supabase/migrations/20260401_detail_peminjaman_return_status.sql`

- [ ] Tambahkan migration kolom status dan timestamp pengembalian per detail
- [ ] Backfill data lama berdasarkan status parent
- [ ] Apply migration ke database jika akses tersedia

## Chunk 3: Borrower return flow

### Task 3: Ubah form pengembalian pegawai jadi per detail

**Files:**
- Modify: `app/pegawai/pengembalian/form/page.tsx`

- [ ] Query status detail pengembalian
- [ ] Ubah selection dari `id_peminjaman` ke `detail_peminjaman.id`
- [ ] Update hanya detail terpilih ke `konfirmasi_pengembalian`
- [ ] Rehitung status parent setelah submit

### Task 4: Tampilkan riwayat pengembalian peminjam per detail

**Files:**
- Modify: `app/pegawai/pengembalian/page.tsx`

- [ ] Tampilkan badge status untuk tiap detail
- [ ] Tampilkan transaksi campuran dengan status item yang jelas

## Chunk 4: Admin/operator verification

### Task 5: Konfirmasi pengembalian per detail

**Files:**
- Modify: `app/admin/pengembalian/page.tsx`
- Modify: `app/operator/pengembalian/page.tsx`

- [ ] Tampilkan tombol konfirmasi di level detail
- [ ] Saat konfirmasi, update stok hanya untuk item terkait
- [ ] Update status detail ke `dikembalikan`
- [ ] Rehitung status parent

### Task 6: Tutup jalur bypass konfirmasi massal

**Files:**
- Modify: `app/operator/peminjaman/page.tsx`

- [ ] Hapus aksi konfirmasi pengembalian massal dari halaman peminjaman
- [ ] Ganti dengan CTA menuju menu pengembalian bila perlu

## Chunk 5: Verification

### Task 7: Verifikasi akhir

**Files:**
- Modify: file-file yang berubah di atas

- [ ] Jalankan `npm test`
- [ ] Jalankan lint terarah untuk file yang disentuh
- [ ] Jalankan `npm run build`
