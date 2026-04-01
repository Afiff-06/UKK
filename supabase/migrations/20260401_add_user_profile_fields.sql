alter table public.tb_user
    add column if not exists no_telp text,
    add column if not exists nisn text,
    add column if not exists kelas text,
    add column if not exists konsentrasi_keahlian text;

create index if not exists idx_tb_user_no_telp on public.tb_user (no_telp);
create index if not exists idx_tb_user_nisn on public.tb_user (nisn);
create index if not exists idx_tb_user_kelas on public.tb_user (kelas);
