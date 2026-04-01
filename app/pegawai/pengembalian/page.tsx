"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { isPastDueDate } from "@/lib/peminjaman-status";
import { isBorrowerRole } from "@/lib/roles";
import {
  getLegacyDetailReturnStatus,
  isMissingDetailReturnColumnsError,
  type DetailReturnStatus,
} from "@/lib/return-workflow";

interface Peminjaman {
  id_peminjaman: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  jam_kembali: string | null;
  status: string;
  pegawai?: { nama: string; username: string };
  petugas?: { nama: string };
  detail_peminjaman: {
    id: string;
    jumlah: number;
    status_pengembalian: DetailReturnStatus | null;
    inventaris:
      | { nama: string; kode_inventaris: number }
      | { nama: string; kode_inventaris: number }[];
  }[];
}

const normalizeDetailStatus = (
  status: DetailReturnStatus | null | undefined,
): DetailReturnStatus => {
  if (status === "konfirmasi_pengembalian" || status === "dikembalikan") {
    return status;
  }

  return "dipinjam";
};

export default function PengembalianPage() {
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);

  const router = useRouter();
  const { role, profile } = useAuth();
  const supabase = createClient();
  const borrowerMode = isBorrowerRole(role);

  const fetchPeminjaman = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("peminjaman")
        .select(
          `
            *,
            pegawai:id_pegawai (nama, username),
            petugas:id_petugas (nama),
            detail_peminjaman (
              id,
              jumlah,
              status_pengembalian,
              inventaris:id_inventaris (nama, kode_inventaris)
            )
          `,
        )
        .in("status", ["dipinjam", "konfirmasi_pengembalian", "dikembalikan", "terlambat"])
        .order("tanggal_pinjam", { ascending: false });

      if (borrowerMode && profile?.id) {
        query = query.eq("id_pegawai", profile.id);
      }

      const detailedQuery = await query;

      if (detailedQuery.error) {
        if (!isMissingDetailReturnColumnsError(detailedQuery.error)) {
          throw detailedQuery.error;
        }

        let legacyQuery = supabase
          .from("peminjaman")
          .select(
            `
              *,
              pegawai:id_pegawai (nama, username),
              petugas:id_petugas (nama),
              detail_peminjaman (
                id,
                jumlah,
                inventaris:id_inventaris (nama, kode_inventaris)
              )
            `,
          )
          .in("status", ["dipinjam", "konfirmasi_pengembalian", "dikembalikan", "terlambat"])
          .order("tanggal_pinjam", { ascending: false });

        if (borrowerMode && profile?.id) {
          legacyQuery = legacyQuery.eq("id_pegawai", profile.id);
        }

        const legacyResult = await legacyQuery;

        if (legacyResult.error) throw legacyResult.error;

        const normalized = ((legacyResult.data || []) as Array<Peminjaman>).map(
          (item) => ({
            ...item,
            detail_peminjaman: item.detail_peminjaman.map((detail) => ({
              ...detail,
              status_pengembalian: getLegacyDetailReturnStatus(item.status),
            })),
          }),
        );

        setSchemaNotice(
          "Database masih memakai skema lama, jadi status pengembalian ditampilkan per transaksi.",
        );
        setPeminjaman(normalized);
        return;
      }

      setSchemaNotice(null);
      setPeminjaman(detailedQuery.data || []);
    } catch (error) {
      console.error("Error fetching peminjaman:", error);
      setSchemaNotice("Gagal memuat data pengembalian.");
    } finally {
      setLoading(false);
    }
  }, [borrowerMode, profile?.id, supabase]);

  useEffect(() => {
    if (profile) {
      fetchPeminjaman();
    }
  }, [fetchPeminjaman, profile]);

  const pendingCount = peminjaman.flatMap((item) => item.detail_peminjaman).filter(
    (detail) => normalizeDetailStatus(detail.status_pengembalian) === "konfirmasi_pengembalian",
  ).length;

  const completedCount = peminjaman.flatMap((item) => item.detail_peminjaman).filter(
    (detail) => normalizeDetailStatus(detail.status_pengembalian) === "dikembalikan",
  ).length;

  const filteredPeminjaman = peminjaman.filter((item) => {
    const hasReturnProgress =
      item.detail_peminjaman.some(
        (detail) => normalizeDetailStatus(detail.status_pengembalian) !== "dipinjam",
      ) || item.status !== "dipinjam";

    if (!hasReturnProgress) {
      return false;
    }

    const pegawaiName = item.pegawai?.nama?.toLowerCase() || "";
    const items = item.detail_peminjaman
      .map((d) => {
        const inv = Array.isArray(d.inventaris) ? d.inventaris[0] : d.inventaris;
        return inv?.nama?.toLowerCase() || "";
      })
      .join(" ");

    const matchesSearch =
      pegawaiName.includes(searchQuery.toLowerCase()) ||
      items.includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      item.detail_peminjaman.some(
        (detail) => normalizeDetailStatus(detail.status_pengembalian) === statusFilter,
      ) ||
      (statusFilter === "terlambat" && item.status === "terlambat");

    return matchesSearch && matchesStatus;
  });

  const getLoanStatusBadge = (status: string) => {
    switch (status) {
      case "konfirmasi_pengembalian":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            <Clock size={14} /> Ada Pengembalian Menunggu
          </span>
        );
      case "dikembalikan":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            <CheckCircle size={14} /> Transaksi Selesai
          </span>
        );
      case "terlambat":
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            <AlertTriangle size={14} /> Selesai Terlambat
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <RotateCcw size={14} /> Sebagian Masih Dipinjam
          </span>
        );
    }
  };

  const getDetailStatusBadge = (
    status: DetailReturnStatus | null,
    overdue: boolean,
  ) => {
    const normalizedStatus = normalizeDetailStatus(status);

    if (normalizedStatus === "konfirmasi_pengembalian") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <Clock size={12} /> Menunggu Verifikasi
        </span>
      );
    }

    if (normalizedStatus === "dikembalikan") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <CheckCircle size={12} /> Dikembalikan
        </span>
      );
    }

    if (overdue) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <AlertTriangle size={12} /> Masih Dipinjam
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <RotateCcw size={12} /> Masih Dipinjam
      </span>
    );
  };

  const isOverdue = (
    tanggalPinjam: string,
    tanggalKembali: string | null,
    jamKembali: string | null,
  ) => isPastDueDate(tanggalPinjam, tanggalKembali, new Date(), jamKembali);

  return (
    <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col overflow-auto">
        <Header title="Pengembalian" />

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-800">
                Pengembalian Barang
              </h1>
              <p className="text-gray-500">
                {borrowerMode
                  ? "Pantau status pengembalian tiap jenis barang Anda"
                : "Kelola pengembalian barang yang dipinjam"}
              </p>
            </div>
          </div>
          {schemaNotice && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {schemaNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Menunggu Verifikasi</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sudah Dikembalikan</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {completedCount}
                  </p>
                </div>
              </div>
            </div>
            {borrowerMode && (
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => router.push("/pegawai/pengembalian/form")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 hover:scale-105 active:scale-95"
                >
                  <RotateCcw size={20} />
                  Mulai Pengembalian
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-4 mb-6">
            <select
              className="border rounded-xl px-4 py-2 bg-white text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="konfirmasi_pengembalian">Menunggu Verifikasi</option>
              <option value="dikembalikan">Sudah Dikembalikan</option>
              <option value="terlambat">Terlambat</option>
            </select>
            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <input
                className="border rounded-xl pl-10 pr-4 py-2 w-full md:w-64 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                placeholder="Cari peminjam atau barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-12">
                <LoadingSpinner />
              </div>
            ) : filteredPeminjaman.length === 0 ? (
              <div className="p-12 text-center">
                <RotateCcw className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">
                  Belum ada progres pengembalian yang bisa ditampilkan
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 text-left">Barang</th>
                    <th className="px-6 py-4 text-left">Tanggal Pinjam</th>
                    <th className="px-6 py-4 text-left w-60">Status Transaksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredPeminjaman.map((item) => {
                    const overdue = isOverdue(
                      item.tanggal_pinjam,
                      item.tanggal_kembali,
                      item.jam_kembali,
                    );

                    return (
                      <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-400 tracking-wide">
                              Transaksi #{item.id_peminjaman.slice(0, 8)}
                            </p>
                            {item.detail_peminjaman.map((detail) => {
                              const inv = Array.isArray(detail.inventaris)
                                ? detail.inventaris[0]
                                : detail.inventaris;

                              return (
                                <div
                                  key={detail.id}
                                  className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-800 font-medium">
                                      {inv?.nama}
                                    </span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                      x{detail.jumlah}
                                    </span>
                                  </div>
                                  {getDetailStatusBadge(
                                    detail.status_pengembalian,
                                    overdue,
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-gray-800">
                              {new Date(item.tanggal_pinjam).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </p>
                            {overdue && item.status === "dipinjam" && (
                              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertTriangle size={12} /> Jatuh tempo lewat
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getLoanStatusBadge(item.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
