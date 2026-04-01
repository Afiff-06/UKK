"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/header";
import { isPastDueDate } from "@/lib/peminjaman-status";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { isBorrowerRole } from "@/lib/roles";

interface RiwayatPeminjaman {
  id_peminjaman: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  jam_pinjam: string | null;
  jam_kembali: string | null;
  status: string;
  alasan_penolakan: string | null;
  pegawai?: { nama: string; username: string };
  detail_peminjaman: {
    id: string;
    jumlah: number;
    inventaris: { nama: string; kode_inventaris: number };
  }[];
}

interface RiwayatPeminjamanRow {
  id_peminjaman: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  jam_pinjam: string | null;
  jam_kembali: string | null;
  status: string;
  alasan_penolakan: string | null;
  pegawai?: { nama: string; username: string }[] | null;
  detail_peminjaman?:
    | {
        id: string;
        jumlah: number;
        inventaris?:
          | { nama: string; kode_inventaris: number }[]
          | { nama: string; kode_inventaris: number }
          | null;
      }[]
    | null;
}

const getInventarisDetail = (
  inventaris?: { nama: string; kode_inventaris: number }[] | { nama: string; kode_inventaris: number } | null,
) => {
  if (!inventaris) {
    return { nama: "", kode_inventaris: 0 };
  }

  if (Array.isArray(inventaris)) {
    return inventaris[0] ?? { nama: "", kode_inventaris: 0 };
  }

  return inventaris;
};

export default function Peminjaman() {
  const [riwayatPeminjaman, setRiwayatPeminjaman] = useState<
    RiwayatPeminjaman[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { role, profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const borrowerMode = isBorrowerRole(role);

  const isOverdue = (tanggalPinjam: string, tanggalKembali: string | null, status: string, jamKembali?: string | null) => {
    if (status !== "dipinjam") return false;
    return isPastDueDate(tanggalPinjam, tanggalKembali, new Date(), jamKembali);
  };

  const getStatusBadge = (status: string, tanggalPinjam: string, tanggalKembali: string | null, jamKembali?: string | null, alasanPenolakan?: string | null) => {
    if (status === "terlambat" || isOverdue(tanggalPinjam, tanggalKembali, status, jamKembali)) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
          <AlertTriangle size={14} /> Terlambat
        </span>
      );
    }

    switch (status) {
      case "pending":
      case "konfirmasi_peminjaman":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            <Clock size={14} /> Menunggu
          </span>
        );
      case "dipinjam":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <CheckCircle2 size={14} /> Dipinjam
          </span>
        );
      case "dikembalikan":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            <CheckCircle2 size={14} /> Dikembalikan
          </span>
        );
      case "ditolak":
        return (
          <div>
            <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
              <XCircle size={14} /> Ditolak
            </span>
            {alasanPenolakan && (
              <p className="text-xs text-red-500 mt-1 max-w-[200px]" title={alasanPenolakan}>
                Alasan: {alasanPenolakan}
              </p>
            )}
          </div>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {status}
          </span>
        );
    }
  };

  const fetchRiwayatPeminjaman = useCallback(
    async (currentRole = role, currentProfile = profile) => {
      try {
        let query = supabase
          .from("peminjaman")
          .select(
            `
                    id_peminjaman,
                    tanggal_pinjam,
                    tanggal_kembali,
                    jam_pinjam,
                    jam_kembali,
                    status,
                    alasan_penolakan,
                    pegawai:id_pegawai (nama, username),
                    detail_peminjaman (
                        id,
                        jumlah,
                        inventaris:id_inventaris (nama, kode_inventaris)
                    )
                `,
          )
          .in("status", ["pending", "konfirmasi_peminjaman", "dipinjam", "ditolak"])
          .order("tanggal_pinjam", { ascending: false });

        if (isBorrowerRole(currentRole) && currentProfile?.id) {
          query = query.eq("id_pegawai", currentProfile.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const riwayat = ((data || []) as RiwayatPeminjamanRow[]).map(
          (item) => ({
            id_peminjaman: item.id_peminjaman,
            tanggal_pinjam: item.tanggal_pinjam,
            tanggal_kembali: item.tanggal_kembali,
            jam_pinjam: item.jam_pinjam,
            jam_kembali: item.jam_kembali,
            status: item.status,
            alasan_penolakan: item.alasan_penolakan,
            pegawai: item.pegawai?.[0]
              ? {
                  nama: item.pegawai[0].nama,
                  username: item.pegawai[0].username,
                }
              : undefined,
            detail_peminjaman: (item.detail_peminjaman || []).map((detail) => {
              const inventaris = getInventarisDetail(detail.inventaris);

              return {
                id: detail.id,
                jumlah: detail.jumlah,
                inventaris: {
                  nama: inventaris.nama || "",
                  kode_inventaris: inventaris.kode_inventaris || 0,
                },
              };
            }),
          }),
        );

        setRiwayatPeminjaman(riwayat);
      } catch (error) {
        console.error("Error fetching riwayat peminjaman:", error);
      } finally {
        setLoading(false);
      }
    },
    [profile, role, supabase],
  );

  useEffect(() => {
    fetchRiwayatPeminjaman();
  }, [fetchRiwayatPeminjaman]);

  const filteredRiwayat = riwayatPeminjaman.filter((item) => {
    const barang = item.detail_peminjaman
      .map((d) => d.inventaris.nama.toLowerCase())
      .join(" ");
    return (
      barang.includes(searchQuery.toLowerCase()) ||
      item.id_peminjaman.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const jumlahAktif = riwayatPeminjaman.filter(
    (item) => item.status === "dipinjam",
  ).length;
  const jumlahMenunggu = riwayatPeminjaman.filter((item) =>
    ["pending", "konfirmasi_peminjaman"].includes(item.status),
  ).length;
  const jumlahTerlambat = riwayatPeminjaman.filter((item) =>
    item.status === "terlambat" || isOverdue(item.tanggal_pinjam, item.tanggal_kembali, item.status, item.jam_kembali),
  ).length;

  if (loading) {
    return (
      <div className="flex-1 bg-[#f5f7fb] flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col overflow-auto">
        <Header title="Peminjaman" />

        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-800">
                Riwayat Peminjaman
              </h1>
              <p className="text-gray-500">
                {borrowerMode
                  ? "Pantau status peminjaman barang Anda"
                  : "Kelola peminjaman barang seluruh peminjam"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              icon={<Package className="text-blue-600" />}
              label="Peminjaman Aktif"
              value={jumlahAktif}
              color="blue"
            />
            <SummaryCard
              icon={<Clock className="text-yellow-600" />}
              label="Menunggu"
              value={jumlahMenunggu}
              color="yellow"
            />
            <SummaryCard
              icon={<AlertTriangle className="text-red-600" />}
              label="Terlambat"
              value={jumlahTerlambat}
              color="red"
            />
            <div className="md:col-span-3 flex justify-end">
              <Button
                onClick={() => router.push("/pegawai/peminjaman/form")}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-6 shadow-lg shadow-blue-100 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Plus size={20} />
                {borrowerMode ? "Ajukan Peminjaman" : "Buat Peminjaman"}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-800">
                Daftar Peminjaman Aktif
              </h2>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  className="border border-gray-200 rounded-2xl pl-10 pr-4 py-2 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-64 text-sm"
                  placeholder="Cari barang atau ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredRiwayat.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="text-gray-300" size={40} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Tidak Ada Data
                </h3>
                <p className="text-gray-500">
                  Belum ada riwayat peminjaman yang ditemukan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 text-left">Barang</th>
                      <th className="px-8 py-5 text-left">Tanggal Pinjam</th>
                      <th className="px-8 py-5 text-left">Tanggal Kembali</th>
                      <th className="px-8 py-5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRiwayat.map((item) => (
                      <tr
                        key={item.id_peminjaman}
                        className="group hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="space-y-1.5">
                            {item.detail_peminjaman.map((detail) => (
                              <div
                                key={detail.id}
                                className="flex items-center gap-3"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span className="font-semibold text-gray-800">
                                  {detail.inventaris?.nama}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
                                  {detail.jumlah} Unit
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-medium text-gray-700">
                            {new Date(item.tanggal_pinjam).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {item.jam_pinjam?.slice(0, 5) || "--:--"} - {item.jam_kembali?.slice(0, 5) || "--:--"}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-gray-500">
                            {item.tanggal_kembali
                              ? new Date(
                                  item.tanggal_kembali,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "-"}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          {getStatusBadge(item.status, item.tanggal_pinjam, item.tanggal_kembali, item.jam_kembali, item.alasan_penolakan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "yellow" | "red";
}) {
  const bgColors = {
    blue: "bg-blue-50",
    yellow: "bg-yellow-50",
    red: "bg-red-50",
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg shadow-gray-100/50 border border-gray-50 flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div
        className={`w-14 h-14 ${bgColors[color]} rounded-2xl flex items-center justify-center text-2xl`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
