"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { isPastDueDate } from "@/lib/peminjaman-status";
import { showSuccess, showError, showConfirm } from "@/lib/swal";
import { formatBorrowerIdentity } from "@/lib/roles";
import {
  canConfirmReturnDetail,
  deriveLoanStatusFromReturnDetails,
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
  pegawai?: { nama: string; username: string; role?: string | null };
  petugas?: { nama: string };
  detail_peminjaman: {
    id: string;
    jumlah: number;
    status_pengembalian: DetailReturnStatus | null;
    jumlah_baik?: number | null;
    jumlah_rusak_ringan?: number | null;
    jumlah_rusak_berat?: number | null;
    inventaris: {
      id_inventaris: string;
      nama: string;
      kode_inventaris: number;
      jumlah: number;
    };
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [detailWorkflowSupported, setDetailWorkflowSupported] = useState(true);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);
  const { profile } = useAuth();
  const supabase = createClient();

  const fetchPeminjaman = useCallback(async () => {
    setLoading(true);
    try {
      const detailedQuery = await supabase
        .from("peminjaman")
        .select(
          `
            *,
            pegawai:id_pegawai (nama, username, role),
            petugas:id_petugas (nama),
            detail_peminjaman (
              id,
              jumlah,
              status_pengembalian,
              jumlah_baik,
              jumlah_rusak_ringan,
              jumlah_rusak_berat,
              inventaris:id_inventaris (id_inventaris, nama, kode_inventaris, jumlah)
            )
          `,
        )
        .in("status", ["dipinjam", "konfirmasi_pengembalian", "dikembalikan", "terlambat"])
        .order("tanggal_pinjam", { ascending: false });

      if (detailedQuery.error) {
        if (!isMissingDetailReturnColumnsError(detailedQuery.error)) {
          throw detailedQuery.error;
        }

        const legacyQuery = await supabase
          .from("peminjaman")
          .select(
            `
              *,
              pegawai:id_pegawai (nama, username, role),
              petugas:id_petugas (nama),
              detail_peminjaman (
                id,
                jumlah,
                inventaris:id_inventaris (id_inventaris, nama, kode_inventaris, jumlah)
              )
            `,
          )
          .in("status", ["dipinjam", "konfirmasi_pengembalian", "dikembalikan", "terlambat"])
          .order("tanggal_pinjam", { ascending: false });

        if (legacyQuery.error) throw legacyQuery.error;

        const normalized = ((legacyQuery.data || []) as Array<Peminjaman>).map(
          (item) => ({
            ...item,
            detail_peminjaman: item.detail_peminjaman.map((detail) => ({
              ...detail,
              status_pengembalian: getLegacyDetailReturnStatus(item.status),
            })),
          }),
        );

        setDetailWorkflowSupported(false);
        setSchemaNotice(
          "Database masih memakai skema lama, jadi verifikasi pengembalian sementara diproses per transaksi.",
        );
        setPeminjaman(normalized);
        return;
      }

      setDetailWorkflowSupported(true);
      setSchemaNotice(null);
      setPeminjaman(detailedQuery.data || []);
    } catch (error) {
      console.error("Error fetching peminjaman:", error);
      setSchemaNotice("Gagal memuat data pengembalian.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (profile) {
      fetchPeminjaman();
    }
  }, [fetchPeminjaman, profile]);

  const handleReturn = async (loanId: string, detailId: string) => {
    const loan = peminjaman.find((item) => item.id_peminjaman === loanId);
    const detail = loan?.detail_peminjaman.find((item) => item.id === detailId);

    if (!loan || !detail) {
      return;
    }

    const confirmed = await showConfirm(
      "Konfirmasi Verifikasi?",
      `Verifikasi pengembalian ${detail.inventaris.nama} (${detail.jumlah} unit) sesuai kondisi yang dilaporkan peminjam?`,
      "Ya, Konfirmasi",
      "Batal"
    );

    if (!confirmed) return;

    // Use reported conditions or default to all Good if missing (legacy)
    const counts = {
      baik: detail.jumlah_baik ?? detail.jumlah,
      rusak_ringan: detail.jumlah_rusak_ringan ?? 0,
      rusak_berat: detail.jumlah_rusak_berat ?? 0
    };

    await confirmGranularReturn(loanId, detailId, counts);
  };

  const confirmGranularReturn = async (loanId: string, detailId: string, counts: { baik: number; rusak_ringan: number; rusak_berat: number }) => {
    const loan = peminjaman.find((item) => item.id_peminjaman === loanId);
    const detail = loan?.detail_peminjaman.find((item) => item.id === detailId);

    if (!loan || !detail) return;

    setProcessingId(detailWorkflowSupported ? detailId : loanId);
    try {
      // 1. Process Inventory Updates for each condition
      const conditions = [
        { type: "Baik", count: counts.baik },
        { type: "Rusak Ringan", count: counts.rusak_ringan },
        { type: "Rusak Berat", count: counts.rusak_berat }
      ];

      for (const cond of conditions) {
        if (cond.count <= 0) continue;

        // Find matching inventory record
        const { data: existingInv } = await supabase
          .from("inventaris")
          .select("id_inventaris, jumlah")
          .eq("nama", detail.inventaris.nama)
          .eq("kondisi", cond.type)
          .maybeSingle();

        if (existingInv) {
          // Increment existing
          const { error: updateError } = await supabase
            .from("inventaris")
            .update({ jumlah: (existingInv.jumlah || 0) + cond.count })
            .eq("id_inventaris", existingInv.id_inventaris);
          
          if (updateError) throw updateError;
        } else {
          // Create new record for this condition
          // Get original details first to copy them
          const { data: originalInv } = await supabase
            .from("inventaris")
            .select("*")
            .eq("id_inventaris", detail.inventaris.id_inventaris)
            .single();
          
          if (originalInv) {
            const { error: insertError } = await supabase
              .from("inventaris")
              .insert({
                ...originalInv,
                id_inventaris: undefined, // Let DB generate new ID
                kondisi: cond.type,
                jumlah: cond.count,
                tanggal_register: new Date().toISOString().split('T')[0]
              });
            
            if (insertError) throw insertError;
          }
        }
      }

      // 2. Update detail_peminjaman with granular counts
      const confirmedAt = new Date().toISOString();
      const { error: detailError } = await supabase
        .from("detail_peminjaman")
        .update({
          status_pengembalian: "dikembalikan",
          dikonfirmasi_pengembalian_pada: confirmedAt,
          jumlah_baik: counts.baik,
          jumlah_rusak_ringan: counts.rusak_ringan,
          jumlah_rusak_berat: counts.rusak_berat
        })
        .eq("id", detailId);

      if (detailError) throw detailError;

      // 3. Update overall loan status
      const nextStatuses: DetailReturnStatus[] = loan.detail_peminjaman.map((item) =>
        item.id === detailId ? "dikembalikan" : item.status_pengembalian || "dipinjam"
      );

      const nextLoanStatus = deriveLoanStatusFromReturnDetails({
        detailStatuses: nextStatuses,
        tanggalPinjam: loan.tanggal_pinjam,
        tanggalKembali: loan.tanggal_kembali,
        jamKembali: loan.jam_kembali,
      });

      const { error: loanError } = await supabase
        .from("peminjaman")
        .update({ status: nextLoanStatus })
        .eq("id_peminjaman", loanId);

      if (loanError) throw loanError;

      await showSuccess("Berhasil!", "Pengembalian barang berhasil dikonfirmasi secara granular.");
      fetchPeminjaman();
    } catch (error: any) {
      console.error("Error processing return:", error);
      await showError("Gagal", error.message || "Gagal memproses pengembalian.");
    } finally {
      setProcessingId(null);
    }
  };

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
    const itemsList = item.detail_peminjaman
      .map((detail) => detail.inventaris?.nama?.toLowerCase() || "")
      .join(" ");

    const matchesSearch =
      pegawaiName.includes(searchQuery.toLowerCase()) ||
      itemsList.includes(searchQuery.toLowerCase());

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
            <RotateCcw size={14} /> Menunggu Verifikasi
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
            <Clock size={14} /> Sebagian Masih Dipinjam
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
          <RotateCcw size={12} /> Menunggu Verifikasi
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
          <AlertTriangle size={12} /> Belum Diajukan
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <Clock size={12} /> Belum Diajukan
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
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Pengembalian Barang
          </h1>
          <p className="text-gray-500 mb-6">
            Kelola verifikasi pengembalian per jenis barang
          </p>
          {schemaNotice && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {schemaNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <Clock className="text-yellow-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Menunggu Verifikasi
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Sudah Dikembalikan
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {completedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-4 mb-6">
            <select
              className="border rounded-xl px-4 py-2 bg-white text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                className="w-full md:w-72 pl-10 pr-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Cari peminjam atau barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-50">
            {loading ? (
              <div className="p-12">
                <LoadingSpinner />
              </div>
            ) : filteredPeminjaman.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100">
                  <RotateCcw className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Tidak Ada Pengembalian
                </h3>
                <p className="text-gray-500">
                  Tidak ada progres pengembalian yang perlu ditampilkan saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-sm font-semibold text-gray-500">
                    <tr>
                      <th className="px-6 py-4 text-left">Peminjam</th>
                      <th className="px-6 py-4 text-left">Detail Pengembalian</th>
                      <th className="px-6 py-4 text-left">Tanggal Pinjam</th>
                      <th className="px-6 py-4 text-left">Status Transaksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredPeminjaman.map((item) => {
                      const overdue = isOverdue(
                        item.tanggal_pinjam,
                        item.tanggal_kembali,
                        item.jam_kembali,
                      );

                      return (
                        <tr
                          key={item.id_peminjaman}
                          className="group hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-sm">
                                {item.pegawai?.nama?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">
                                  {item.pegawai?.nama || "Unknown"}
                                </p>
                                <p className="text-xs text-gray-400 font-medium tracking-tight">
                                  {formatBorrowerIdentity(item.pegawai ?? {}) || "-"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-gray-400 tracking-wide">
                                Transaksi #{item.id_peminjaman.slice(0, 8)}
                              </p>
                              {item.detail_peminjaman.map((detail, detailIndex) => {
                                const isConfirmable = canConfirmReturnDetail(
                                  detail.status_pengembalian,
                                );
                                const showActionButton = detailWorkflowSupported
                                  ? isConfirmable
                                  : detailIndex === 0 && item.status === "konfirmasi_pengembalian";

                                return (
                                  <div
                                    key={detail.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-gray-100 px-4 py-3"
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-gray-800">
                                            {detail.inventaris?.nama}
                                          </span>
                                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                            x{detail.jumlah}
                                          </span>
                                        </div>
                                        {getDetailStatusBadge(
                                          detail.status_pengembalian,
                                          overdue,
                                        )}
                                      </div>
                                      <div className="flex justify-end min-w-[172px]">
                                        {showActionButton ? (
                                          <button
                                            onClick={() =>
                                              handleReturn(item.id_peminjaman, detail.id)
                                            }
                                            disabled={
                                              processingId ===
                                              (detailWorkflowSupported ? detail.id : item.id_peminjaman)
                                            }
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-semibold shadow-md shadow-green-100 disabled:opacity-50"
                                          >
                                            {processingId ===
                                            (detailWorkflowSupported ? detail.id : item.id_peminjaman) ? (
                                              <LoadingSpinner size="sm" />
                                            ) : (
                                              <CheckCircle size={16} />
                                            )}
                                            {detailWorkflowSupported
                                              ? "Konfirmasi"
                                              : "Konfirmasi Transaksi"}
                                          </button>
                                        ) : (
                                          <span className="text-gray-400 text-sm italic font-medium">
                                            {!detailWorkflowSupported &&
                                            item.status === "konfirmasi_pengembalian"
                                              ? "Ikuti transaksi"
                                              : normalizeDetailStatus(
                                                    detail.status_pengembalian,
                                                  ) === "dikembalikan"
                                              ? "Selesai"
                                              : "Belum diajukan"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {(detail.jumlah_baik || detail.jumlah_rusak_ringan || detail.jumlah_rusak_berat) ? (
                                      <div className="mt-2 flex flex-wrap gap-2 border-t pt-2 border-gray-50">
                                        {detail.jumlah_baik ? (
                                          <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                                            {detail.jumlah_baik} Baik
                                          </span>
                                        ) : null}
                                        {detail.jumlah_rusak_ringan ? (
                                          <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                                            {detail.jumlah_rusak_ringan} Rusak Ringan
                                          </span>
                                        ) : null}
                                        {detail.jumlah_rusak_berat ? (
                                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                            {detail.jumlah_rusak_berat} Rusak Berat
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-8 py-5 font-bold text-gray-700">
                            <div>
                              <p>
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
                                <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-bold">
                                  <AlertTriangle size={10} /> Jatuh tempo lewat
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
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
