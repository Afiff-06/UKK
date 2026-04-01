alter table public.detail_peminjaman
  add column if not exists status_pengembalian text not null default 'dipinjam',
  add column if not exists diajukan_pengembalian_pada timestamptz,
  add column if not exists dikonfirmasi_pengembalian_pada timestamptz;

alter table public.detail_peminjaman
  drop constraint if exists detail_peminjaman_status_pengembalian_check;

alter table public.detail_peminjaman
  add constraint detail_peminjaman_status_pengembalian_check
  check (
    status_pengembalian in (
      'dipinjam',
      'konfirmasi_pengembalian',
      'dikembalikan'
    )
  );

update public.detail_peminjaman as detail
set
  status_pengembalian = case
    when peminjaman.status = 'konfirmasi_pengembalian' then 'konfirmasi_pengembalian'
    when peminjaman.status in ('dikembalikan', 'terlambat') then 'dikembalikan'
    else 'dipinjam'
  end,
  diajukan_pengembalian_pada = case
    when peminjaman.status in ('konfirmasi_pengembalian', 'dikembalikan', 'terlambat')
      then coalesce(detail.diajukan_pengembalian_pada, now())
    else detail.diajukan_pengembalian_pada
  end,
  dikonfirmasi_pengembalian_pada = case
    when peminjaman.status in ('dikembalikan', 'terlambat')
      then coalesce(detail.dikonfirmasi_pengembalian_pada, now())
    else detail.dikonfirmasi_pengembalian_pada
  end
from public.peminjaman
where peminjaman.id_peminjaman = detail.id_peminjaman;
