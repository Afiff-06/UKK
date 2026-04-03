"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import InventarisTable, { type InventarisTableItem } from "@/components/inventaris-table";

interface Inventaris extends InventarisTableItem {
    id_jenis: string;
    id_ruang: string;
    tanggal_register: string;
}

interface Jenis {
    id_jenis: string;
    nama_jenis: string;
}

interface Ruang {
    id_ruang: string;
    nama_ruang: string;
}

export default function AdminInventarisPage() {
    const [items, setItems] = useState<Inventaris[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterKondisi, setFilterKondisi] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"utama" | "kembali">("utama");

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const inventarisRes = await supabase
                .from('inventaris')
                .select(`
                    *,
                    jenis:id_jenis (nama_jenis),
                    ruang:id_ruang (nama_ruang)
                `)
                .order('kode_inventaris', { ascending: true });

            if (inventarisRes.data) setItems(inventarisRes.data as Inventaris[]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-auto">
                <Header title="Inventaris Barang" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Inventaris Barang</h1>
                    <p className="text-gray-500 mb-6">Lihat data barang inventaris (Administrator - Lihat Saja)</p>

                    <InventarisTable
                        items={items}
                        loading={loading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterKondisi={filterKondisi}
                        onFilterKondisiChange={setFilterKondisi}
                        sourceFilter={sourceFilter}
                        onSourceFilterChange={setSourceFilter}
                        mode="readOnly"
                    />
                </div>
            </main>
        </div>
    );
}
