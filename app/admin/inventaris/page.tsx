"use client";

import { useEffect, useState } from "react";

import Header from "@/components/header";
import InventarisTable, { type InventarisTableItem } from "@/components/inventaris-table";
import { createClient } from "@/lib/supabase/client";

export default function AdminInventarisPage() {
    const [items, setItems] = useState<InventarisTableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterKondisi, setFilterKondisi] = useState("");

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("inventaris")
                    .select(`
                        id_inventaris,
                        kode_inventaris,
                        nama,
                        jumlah,
                        kondisi,
                        keterangan,
                        jenis:id_jenis (nama_jenis),
                        ruang:id_ruang (nama_ruang)
                    `)
                    .order("kode_inventaris", { ascending: true });

                if (error) throw error;
                setItems((data || []) as InventarisTableItem[]);
            } catch (error) {
                console.error("Error fetching inventaris:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase]);

    return (
        <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-auto">
                <Header title="Inventaris Barang" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Inventaris Barang</h1>
                    <p className="text-gray-500 mb-6">Lihat stok barang inventaris yang tersedia</p>

                    <InventarisTable
                        items={items}
                        loading={loading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterKondisi={filterKondisi}
                        onFilterKondisiChange={setFilterKondisi}
                        mode="readOnly"
                    />
                </div>
            </main>
        </div>
    );
}
