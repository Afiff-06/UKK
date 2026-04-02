"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RotateCcw,
  Package,
  AlertTriangle,
  Check,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  canRequestReturnDetail,
  deriveLoanStatusFromReturnDetails,
  getLegacyDetailReturnStatus,
  isMissingDetailReturnColumnsError,
  type DetailReturnStatus,
} from "@/lib/return-workflow";
import { showConfirm, showError, showSuccess, showWarning } from "@/lib/swal";
import ReturnConditionModal from "@/components/return-condition-modal";

interface Peminjaman {
  id_peminjaman: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  jam_kembali: string | null;
  status: string;
  detail_peminjaman: {
    id: string;
    jumlah: number;
    status_pengembalian: DetailReturnStatus | null;
    inventaris:
      | { nama: string; kode_inventaris: number }
      | { nama: string; kode_inventaris: number }[];
  }[];
}

interface ReturnableDetailRow {
  id: string;
  id_peminjaman: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  jam_kembali: string | null;
  jumlah: number;
  status_pengembalian: DetailReturnStatus | null;
  inventaris?: { nama: string; kode_inventaris: number };
}

export default function PengembalianForm() {
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailWorkflowSupported, setDetailWorkflowSupported] = useState(true);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);

  // Condition counts state
  const [itemConditions, setItemConditions] = useState<Record<string, { baik: number, rusak_ringan: number, rusak_berat: number }>>({});
  const [modalItem, setModalItem] = useState<{ id: string, nama: string, jumlah: number } | null>(null);

  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();

  const fetchPeminjaman = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const detailedQuery = await supabase
        .from("peminjaman")
        .select(
          `
            id_peminjaman,
            tanggal_pinjam,
            tanggal_kembali,
            jam_kembali,
            status,
            detail_peminjaman (
              id,
              jumlah,
              status_pengembalian,
              inventaris:id_inventaris (nama, kode_inventaris)
            )
          `,
        )
        .eq("id_pegawai", profile.id)
        .in("status", ["dipinjam", "konfirmasi_pengembalian"])
        .order("tanggal_pinjam", { ascending: false });

      if (detailedQuery.error) {
        if (!isMissingDetailReturnColumnsError(detailedQuery.error)) {
          throw detailedQuery.error;
        }

        const legacyQuery = await supabase
          .from("peminjaman")
          .select(
            `
              id_peminjaman,
              tanggal_pinjam,
              tanggal_kembali,
              jam_kembali,
              status,
              detail_peminjaman (
                id,
                jumlah,
                inventaris:id_inventaris (nama, kode_inventaris)
              )
            `,
          )
          .eq("id_pegawai", profile.id)
          .in("status", ["dipinjam", "konfirmasi_pengembalian"])
          .order("tanggal_pinjam", { ascending: false });

        if (legacyQuery.error) throw legacyQuery.error;

        const normalized = ((legacyQuery.data || []) as Array<{
          id_peminjaman: string;
          tanggal_pinjam: string;
          tanggal_kembali: string | null;
          jam_kembali: string | null;
          status: string;
          detail_peminjaman: Array<{
            id: string;
            jumlah: number;
            inventaris:
              | { nama: string; kode_inventaris: number }
              | { nama: string; kode_inventaris: number }[];
          }>;
        }>).map((item) => ({
          ...item,
          detail_peminjaman: item.detail_peminjaman.map((detail) => ({
            ...detail,
            status_pengembalian: getLegacyDetailReturnStatus(item.status),
          })),
        }));

        setDetailWorkflowSupported(false);
        setSchemaNotice(
          "Database masih memakai skema lama, jadi pengajuan pengembalian sementara diproses per transaksi.",
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
  }, [profile?.id, supabase]);

  useEffect(() => {
    if (profile) {
      fetchPeminjaman();
    }
  }, [fetchPeminjaman, profile]);

  const toggleSelection = (id: string) => {
    if (!detailWorkflowSupported) {
      const loan = peminjaman.find((item) =>
        item.detail_peminjaman.some((detail) => detail.id === id),
      );

      if (!loan) {
        return;
      }

      const loanDetailIds = loan.detail_peminjaman.map((detail) => detail.id);

      setSelectedIds((prev) => {
        const alreadySelected = loanDetailIds.every((detailId) =>
          prev.includes(detailId),
        );

        if (alreadySelected) {
          return prev.filter((detailId) => !loanDetailIds.includes(detailId));
        }

        return [...new Set([...prev, ...loanDetailIds])];
      });
      return;
    }

    setSelectedIds((prev) => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      
      // Cleanup condition state if removing
      if (isRemoving) {
        setItemConditions(current => {
          const updated = { ...current };
          delete updated[id];
          return updated;
        });
      }
      
      return next;
    });
  };

  const openConditionModal = (id: string, nama: string, jumlah: number) => {
    setModalItem({ id, nama, jumlah });
  };

  const handleConditionConfirm = async (counts: { baik: number; rusak_ringan: number; rusak_berat: number }) => {
    if (!modalItem) return;
    
    setItemConditions(prev => ({
      ...prev,
      [modalItem.id]: counts
    }));
    setModalItem(null);
  };

  const returnableDetails: ReturnableDetailRow[] = peminjaman.flatMap((item) =>
    item.detail_peminjaman
      .filter((detail) => canRequestReturnDetail(detail.status_pengembalian))
      .map((detail) => {
        const inventaris = Array.isArray(detail.inventaris)
          ? detail.inventaris[0]
          : detail.inventaris;

        return {
          id: detail.id,
          id_peminjaman: item.id_peminjaman,
          tanggal_pinjam: item.tanggal_pinjam,
          tanggal_kembali: item.tanggal_kembali,
          jam_kembali: item.jam_kembali,
          jumlah: detail.jumlah,
          status_pengembalian: detail.status_pengembalian,
          inventaris,
        };
      }),
  );

  const filteredDetails = returnableDetails.filter((detail) => {
    const itemName = detail.inventaris?.nama?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();

    return (
      itemName.includes(search) || detail.id_peminjaman.toLowerCase().includes(search)
    );
  });

  const selectedTransactionCount = [
    ...new Set(
      returnableDetails
        .filter((detail) => selectedIds.includes(detail.id))
        .map((detail) => detail.id_peminjaman),
    ),
  ].length;

  const handleBatchReturn = async () => {
    if (selectedIds.length === 0) return;

    const selectedDetails = returnableDetails.filter((detail) =>
      selectedIds.includes(detail.id),
    );
    const affectedLoanIds = [...new Set(selectedDetails.map((detail) => detail.id_peminjaman))];

    const confirmed = await showConfirm(
      detailWorkflowSupported
        ? `Ajukan pengembalian ${selectedIds.length} jenis barang?`
        : `Ajukan pengembalian ${affectedLoanIds.length} transaksi?`,
      detailWorkflowSupported
        ? "Barang yang dipilih akan menunggu verifikasi petugas."
        : "Karena database masih memakai skema lama, pengembalian akan diajukan per transaksi.",
      "Ya, Ajukan",
      "Batal",
    );

    if (!confirmed) return;

    // Check if all selected items have conditions set
    const missingConditions = selectedDetails.filter(d => !itemConditions[d.id]);
    if (missingConditions.length > 0) {
      await showWarning("Perhatian", "Harap atur kondisi untuk semua barang yang akan dikembalikan.");
      return;
    }

    setSubmitting(true);
    try {
      if (!detailWorkflowSupported) {
        // Legacy mode doesn't support granular conditions easily, 
        // but we'll still update the loan status
        const { error } = await supabase
          .from("peminjaman")
          .update({ status: "konfirmasi_pengembalian" })
          .in("id_peminjaman", affectedLoanIds);

        if (error) throw error;
      } else {
        // Update each detail with its reported condition
        for (const detailId of selectedIds) {
          const condition = itemConditions[detailId];
          const { error } = await supabase
            .from("detail_peminjaman")
            .update({
              status_pengembalian: "konfirmasi_pengembalian",
              diajukan_pengembalian_pada: new Date().toISOString(),
              jumlah_baik: condition.baik,
              jumlah_rusak_ringan: condition.rusak_ringan,
              jumlah_rusak_berat: condition.rusak_berat
            })
            .eq("id", detailId);

          if (error) throw error;
        }

        for (const loanId of affectedLoanIds) {
          const loan = peminjaman.find((item) => item.id_peminjaman === loanId);

          if (!loan) {
            continue;
          }

          const nextStatuses = loan.detail_peminjaman.map((detail) =>
            selectedIds.includes(detail.id)
              ? "konfirmasi_pengembalian"
              : detail.status_pengembalian || "dipinjam",
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
        }
      }

      await showSuccess(
        "Berhasil!",
        detailWorkflowSupported
          ? "Pengembalian per jenis barang berhasil diajukan."
          : "Pengembalian berhasil diajukan dalam mode transaksi.",
      );
      router.push("/pegawai/pengembalian");
    } catch (error) {
      console.error("Error submitting return:", error);
      await showError(
        "Gagal",
        "Gagal mengajukan pengembalian. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (tanggalPinjam: string) => {
    const borrowed = new Date(tanggalPinjam);
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays > 7;
  };

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
        <Header title="Pengembalian" />

        <div className="p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Ajukan Pengembalian
          </h1>
          <p className="text-gray-500 mb-8">
            Pilih jenis barang yang ingin Anda kembalikan
          </p>
          {schemaNotice && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {schemaNotice}
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-5xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Barang yang Bisa Dikembalikan
                </h2>
                {selectedIds.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {detailWorkflowSupported
                      ? `${selectedIds.length} Jenis Terpilih`
                      : `${selectedTransactionCount} Transaksi Terpilih`}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  className="border border-gray-200 rounded-2xl pl-10 pr-4 py-2 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-64 text-sm"
                  placeholder="Cari barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredDetails.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="text-gray-300" size={40} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Tidak Ada Barang
                </h3>
                <p className="text-gray-500">
                  Tidak ada jenis barang yang siap diajukan untuk pengembalian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 text-left w-16">Pilih</th>
                      <th className="px-8 py-5 text-left">Barang</th>
                      <th className="px-8 py-5 text-left">Transaksi</th>
                      <th className="px-8 py-5 text-left">Tanggal Pinjam</th>
                      <th className="px-8 py-5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDetails.map((detail) => {
                      const overdue = isOverdue(detail.tanggal_pinjam);
                      const isSelected = selectedIds.includes(detail.id);

                      return (
                        <tr
                          key={detail.id}
                          onClick={() => toggleSelection(detail.id)}
                          className={`group hover:bg-blue-50/30 transition-colors cursor-pointer ${isSelected ? "bg-blue-50/50" : ""}`}
                        >
                          <td className="px-8 py-5">
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-gray-200 group-hover:border-blue-400"
                              }`}
                            >
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${overdue ? "bg-red-400" : "bg-blue-400"}`}
                              ></div>
                              <div>
                                <span className="font-semibold text-gray-800">
                                  {detail.inventaris?.nama}
                                </span>
                                <span className="ml-3 text-xs bg-white/50 border border-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
                                  {detail.jumlah} Unit
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-medium text-gray-700">
                              #{detail.id_peminjaman.slice(0, 8)}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-700">
                                {new Date(detail.tanggal_pinjam).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              {overdue && (
                                <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                                  <AlertTriangle size={12} /> Terlambat
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium w-fit">
                                <Clock size={14} /> Siap Diajukan
                              </span>
                              
                              {isSelected && detailWorkflowSupported && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConditionModal(detail.id, detail.inventaris?.nama || "Barang", detail.jumlah);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    itemConditions[detail.id] 
                                      ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  }`}
                                >
                                  {itemConditions[detail.id] ? <ClipboardCheck size={14} /> : <AlertTriangle size={14} />}
                                  {itemConditions[detail.id] ? "Kondisi Diatur" : "Atur Kondisi"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedIds.length > 0 ? (
                  <span>
                    {detailWorkflowSupported ? (
                      <>
                        Mengajukan <strong>{selectedIds.length}</strong> jenis barang
                      </>
                    ) : (
                      <>
                        Mengajukan <strong>{selectedTransactionCount}</strong> transaksi
                      </>
                    )}
                  </span>
                ) : (
                  <span>Pilih jenis barang di atas untuk mulai mengembalikan</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/pegawai/pengembalian")}
                  className="rounded-xl px-6"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleBatchReturn}
                  disabled={selectedIds.length === 0 || submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-100 flex items-center gap-2 transition-all hover:scale-105 disabled:hover:scale-100"
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RotateCcw size={18} />
                  )}
                  Ajukan Pengembalian
                </Button>
              </div>
            </div>
          </div>
        </div>

        {modalItem && (
          <ReturnConditionModal
            isOpen={!!modalItem}
            onClose={() => setModalItem(null)}
            onConfirm={handleConditionConfirm}
            itemName={modalItem.nama}
            totalQuantity={modalItem.jumlah}
          />
        )}
      </main>
    </div>
  );
}
