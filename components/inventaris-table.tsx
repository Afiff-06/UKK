"use client";

import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";

export interface InventarisTableItem {
    id_inventaris: string;
    kode_inventaris: number;
    nama: string;
    jumlah: number;
    kondisi: string;
    keterangan?: string | null;
    jenis?: { nama_jenis?: string | null } | null;
    ruang?: { nama_ruang?: string | null } | null;
}

interface InventarisTableProps {
    items: InventarisTableItem[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filterKondisi: string;
    onFilterKondisiChange: (value: string) => void;
    sourceFilter: "utama" | "kembali";
    onSourceFilterChange: (value: "utama" | "kembali") => void;
    mode: "manage" | "readOnly";
    onAdd?: () => void;
    onEdit?: (item: InventarisTableItem) => void;
    onDelete?: (id: string) => void;
}

const getKondisiBadgeStyles = (kondisi: string) => {
    const styles: Record<string, { bg: string, text: string, dot: string }> = {
        Baik: { 
            bg: "bg-emerald-50", 
            text: "text-emerald-700 border-emerald-100", 
            dot: "bg-emerald-500" 
        },
        "Rusak Ringan": { 
            bg: "bg-amber-50", 
            text: "text-amber-700 border-amber-100", 
            dot: "bg-amber-500" 
        },
        "Rusak Berat": { 
            bg: "bg-rose-50", 
            text: "text-rose-700 border-rose-100", 
            dot: "bg-rose-500" 
        },
    };

    return styles[kondisi] || { 
        bg: "bg-gray-50", 
        text: "text-gray-700 border-gray-100", 
        dot: "bg-gray-500" 
    };
};

export default function InventarisTable({
    items,
    loading,
    searchQuery,
    onSearchChange,
    filterKondisi,
    onFilterKondisiChange,
    sourceFilter,
    onSourceFilterChange,
    mode,
    onAdd,
    onEdit,
    onDelete,
}: InventarisTableProps) {
    const filteredItems = items.filter((item) => {
        const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase())
            || item.kode_inventaris.toString().includes(searchQuery);
        const matchKondisi = !filterKondisi || item.kondisi === filterKondisi;
        
        // Source filtering logic
        const isKembali = item.keterangan?.startsWith("**[KEMBALI]**");
        const matchSource = sourceFilter === "kembali" ? isKembali : !isKembali;
        
        return matchSearch && matchKondisi && matchSource;
    });

    return (
        <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex gap-3">
                    <select
                        value={filterKondisi}
                        onChange={(event) => onFilterKondisiChange(event.target.value)}
                        className="border rounded-xl px-4 py-2 bg-white"
                    >
                        <option value="">Semua Kondisi</option>
                        <option value="Baik">Baik</option>
                        <option value="Rusak Ringan">Rusak Ringan</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                    </select>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => onSourceFilterChange("utama")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                sourceFilter === "utama"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Stok Utama
                        </button>
                        <button
                            onClick={() => onSourceFilterChange("kembali")}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                sourceFilter === "kembali"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Barang Kembali
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            className="border rounded-xl pl-10 pr-4 py-2 w-64 bg-white"
                            placeholder="Cari barang..."
                            value={searchQuery}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                    </div>

                    {mode === "manage" && onAdd && (
                        <button
                            onClick={onAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                        >
                            <Plus size={18} />
                            Tambah Barang
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-12">
                        <LoadingSpinner />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500">Tidak ada data barang</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 text-gray-500 text-sm">
                            <tr>
                                <th className="px-6 py-4 text-left">Kode</th>
                                <th className="px-6 py-4 text-left">Nama Barang</th>
                                <th className="px-6 py-4 text-left">Jenis</th>
                                <th className="px-6 py-4 text-left">Ruang</th>
                                <th className="px-6 py-4 text-center">Stok</th>
                                <th className="px-6 py-4 text-left">Kondisi</th>
                                {mode === "manage" && <th className="px-6 py-4 text-left">Aksi</th>}
                                {sourceFilter === "kembali" && <th className="px-6 py-4 text-left">Dikembalikan Oleh</th>}
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {filteredItems.map((item) => (
                                <tr key={item.id_inventaris} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-sm">
                                        INV-{String(item.kode_inventaris).padStart(4, "0")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Package className="text-blue-600" size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{item.nama}</p>
                                                {item.keterangan && (
                                                    <p className="text-sm text-gray-400">{item.keterangan}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {item.jenis?.nama_jenis || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {item.ruang?.nama_ruang || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-semibold ${item.jumlah <= 5 ? "text-red-600" : "text-gray-800"}`}>
                                            {item.jumlah}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const s = getKondisiBadgeStyles(item.kondisi);
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                    {item.kondisi}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    {mode === "manage" && (
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onEdit?.(item)}
                                                    className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete?.(item.id_inventaris)}
                                                    className="border px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {sourceFilter === "kembali" && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100">
                                                    {item.keterangan?.split("Oleh: ")[1]?.charAt(0) || "?"}
                                                </div>
                                                <span className="font-medium text-gray-700">
                                                    {item.keterangan?.split("Oleh: ")[1] || "-"}
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && filteredItems.length > 0 && (
                    <div className="flex justify-between items-center p-6 text-sm text-gray-500 border-t">
                        <span>Menampilkan {filteredItems.length} dari {items.length} barang</span>
                    </div>
                )}
            </div>
        </>
    );
}
