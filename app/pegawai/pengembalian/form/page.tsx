"use client";

import { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Package,
  AlertTriangle,
  Check,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";

interface Peminjaman {
  id_peminjaman: string;
  tanggal_pinjam: string;
  status: string;
  detail_peminjaman: {
    id: string;
    jumlah: number;
    inventaris:
      | { nama: string; kode_inventaris: number }
      | { nama: string; kode_inventaris: number }[];
  }[];
}

export default function PengembalianForm() {
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();

  const fetchPeminjaman = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("peminjaman")
        .select(
          `
                    id_peminjaman,
                    tanggal_pinjam,
                    status,
                    detail_peminjaman (
                        id,
                        jumlah,
                        inventaris:id_inventaris (nama, kode_inventaris)
                    )
                `,
        )
        .eq("id_pegawai", profile.id)
        .eq("status", "dipinjam")
        .order("tanggal_pinjam", { ascending: false });

      if (error) throw error;
      setPeminjaman(data || []);
    } catch (error) {
      console.error("Error fetching peminjaman:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchPeminjaman();
    }
  }, [profile]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBatchReturn = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Ajukan pengembalian untuk ${selectedIds.length} peminjaman?`))
      return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("peminjaman")
        .update({ status: "konfirmasi_pengembalian" })
        .in("id_peminjaman", selectedIds);

      if (error) throw error;

      alert("Berhasil mengajukan pengembalian. Menunggu konfirmasi operator.");
      router.push("/pegawai/pengembalian");
    } catch (error) {
      console.error("Error submitting return:", error);
      alert("Gagal mengajukan pengembalian. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPeminjaman = peminjaman.filter((item) => {
    const items = item.detail_peminjaman
      .map((d) => {
        const inv = Array.isArray(d.inventaris)
          ? d.inventaris[0]
          : d.inventaris;
        return inv?.nama?.toLowerCase() || "";
      })
      .join(" ");
    return (
      items.includes(searchQuery.toLowerCase()) ||
      item.id_peminjaman.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
            Pilih barang yang ingin Anda kembalikan
          </p>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-5xl">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Barang yang Dipinjam
                </h2>
                {selectedIds.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {selectedIds.length} Terpilih
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

            {filteredPeminjaman.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="text-gray-300" size={40} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Tidak Ada Pinjaman
                </h3>
                <p className="text-gray-500">
                  Anda tidak memiliki barang yang perlu dikembalikan saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 text-left w-16">Pilih</th>
                      <th className="px-8 py-5 text-left">Barang</th>
                      <th className="px-8 py-5 text-left">Tanggal Pinjam</th>
                      <th className="px-8 py-5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPeminjaman.map((item) => {
                      const overdue = isOverdue(item.tanggal_pinjam);
                      const isSelected = selectedIds.includes(
                        item.id_peminjaman,
                      );

                      return (
                        <tr
                          key={item.id_peminjaman}
                          onClick={() => toggleSelection(item.id_peminjaman)}
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
                              {isSelected && (
                                <Check size={14} strokeWidth={3} />
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="space-y-1.5">
                              {item.detail_peminjaman.map((detail) => {
                                const inv = Array.isArray(detail.inventaris)
                                  ? detail.inventaris[0]
                                  : detail.inventaris;
                                return (
                                  <div
                                    key={detail.id}
                                    className="flex items-center gap-3"
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${overdue ? "bg-red-400" : "bg-blue-400"}`}
                                    ></div>
                                    <span className="font-semibold text-gray-800">
                                      {inv?.nama}
                                    </span>
                                    <span className="text-xs bg-white/50 border border-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
                                      {detail.jumlah} Unit
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-700">
                                {new Date(
                                  item.tanggal_pinjam,
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                              {overdue && (
                                <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                                  <AlertTriangle size={12} /> Terlambat
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium w-fit">
                              <Clock size={14} /> Dipinjam
                            </span>
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
                    Mengembalikan <strong>{selectedIds.length}</strong>{" "}
                    peminjaman
                  </span>
                ) : (
                  <span>Pilih item di atas untuk mulai mengembalikan</span>
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
      </main>
    </div>
  );
}
