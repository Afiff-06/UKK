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

export default function InventarisPage() {
    const [items, setItems] = useState<Inventaris[]>([]);
    const [jenisList, setJenisList] = useState<Jenis[]>([]);
    const [ruangList, setRuangList] = useState<Ruang[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Inventaris | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterKondisi, setFilterKondisi] = useState("");

    const [formData, setFormData] = useState({
        nama: "",
        jumlah: 1,
        kondisi: "Baik",
        keterangan: "",
        id_jenis: "",
        id_ruang: "",
    });

    const supabase = createClient();
    const { user } = useAuth()

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [inventarisRes, jenisRes, ruangRes] = await Promise.all([
                supabase
                    .from('inventaris')
                    .select(`
                        *,
                        jenis:id_jenis (nama_jenis),
                        ruang:id_ruang (nama_ruang)
                    `)
                    .order('kode_inventaris', { ascending: true }),
                supabase.from('jenis').select('*'),
                supabase.from('ruang').select('*'),
            ]);

            if (inventarisRes.data) setItems(inventarisRes.data);
            if (jenisRes.data) setJenisList(jenisRes.data);
            if (ruangRes.data) setRuangList(ruangRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async () => {
        try {
            if (editItem) {
                // Update existing item
                const { error } = await supabase
                    .from('inventaris')
                    .update({
                        nama: formData.nama,
                        jumlah: formData.jumlah,
                        kondisi: formData.kondisi,
                        keterangan: formData.keterangan,
                        id_jenis: formData.id_jenis || null,
                        id_ruang: formData.id_ruang || null,
                    })
                    .eq('id_inventaris', editItem.id_inventaris);

                if (error) throw error;
            } else {
                // Get next kode_inventaris
                const { data: maxKode } = await supabase
                    .from('inventaris')
                    .select('kode_inventaris')
                    .order('kode_inventaris', { ascending: false })
                    .limit(1);

                const nextKode = (maxKode?.[0]?.kode_inventaris || 0) + 1;

                // Create new item
                const { error } = await supabase
                    .from('inventaris')
                    .insert({
                        nama: formData.nama,
                        jumlah: formData.jumlah,
                        kondisi: formData.kondisi,
                        keterangan: formData.keterangan,
                        id_jenis: formData.id_jenis || null,
                        id_ruang: formData.id_ruang || null,
                        kode_inventaris: nextKode,
                        id_petugas: user?.id
                    });

                if (error) throw error;
            }

            setShowModal(false);
            setEditItem(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus barang ini?')) return;

        try {
            const { error } = await supabase
                .from('inventaris')
                .delete()
                .eq('id_inventaris', id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const handleEdit = (item: InventarisTableItem) => {
        const fullItem = items.find((current) => current.id_inventaris === item.id_inventaris);
        if (!fullItem) return;

        setEditItem(fullItem);
        setFormData({
            nama: fullItem.nama,
            jumlah: fullItem.jumlah,
            kondisi: fullItem.kondisi,
            keterangan: fullItem.keterangan || "",
            id_jenis: fullItem.id_jenis || "",
            id_ruang: fullItem.id_ruang || "",
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            nama: "",
            jumlah: 1,
            kondisi: "Baik",
            keterangan: "",
            id_jenis: "",
            id_ruang: "",
        });
    };

    const openAddModal = () => {
        setEditItem(null);
        resetForm();
        setShowModal(true);
    };

    return (

        <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-auto">
                <Header title="Inventaris Barang" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Inventaris Barang</h1>
                    <p className="text-gray-500 mb-6">Kelola data barang inventaris</p>

                    <InventarisTable
                        items={items}
                        loading={loading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterKondisi={filterKondisi}
                        onFilterKondisiChange={setFilterKondisi}
                        mode="manage"
                        onAdd={openAddModal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
                        <button
                            onClick={() => {
                                setShowModal(false);
                                setEditItem(null);
                                resetForm();
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X />
                        </button>

                        <h2 className="text-2xl font-semibold mb-6">
                            {editItem ? 'Edit Barang' : 'Tambah Barang'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Nama Barang</label>
                                <input
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder="Masukkan nama barang"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Jumlah</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full border rounded-xl px-4 py-3"
                                        value={formData.jumlah}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({ ...formData, jumlah: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Kondisi</label>
                                    <select
                                        className="w-full border rounded-xl px-4 py-3"
                                        value={formData.kondisi}
                                        onChange={(e) => setFormData({ ...formData, kondisi: e.target.value })}
                                    >
                                        <option value="Baik">Baik</option>
                                        <option value="Rusak Ringan">Rusak Ringan</option>
                                        <option value="Rusak Berat">Rusak Berat</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Jenis</label>
                                    <select
                                        className="w-full border rounded-xl px-4 py-3"
                                        value={formData.id_jenis}
                                        onChange={(e) => setFormData({ ...formData, id_jenis: e.target.value })}
                                    >
                                        <option value="">Pilih Jenis</option>
                                        {jenisList.map(j => (
                                            <option key={j.id_jenis} value={j.id_jenis}>{j.nama_jenis}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Ruang</label>
                                    <select
                                        className="w-full border rounded-xl px-4 py-3"
                                        value={formData.id_ruang}
                                        onChange={(e) => setFormData({ ...formData, id_ruang: e.target.value })}
                                    >
                                        <option value="">Pilih Ruang</option>
                                        {ruangList.map(r => (
                                            <option key={r.id_ruang} value={r.id_ruang}>{r.nama_ruang}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Keterangan</label>
                                <textarea
                                    className="w-full border rounded-xl px-4 py-3 h-20 resize-none"
                                    placeholder="Keterangan tambahan (opsional)"
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditItem(null);
                                    resetForm();
                                }}
                                className="px-5 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.nama}
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editItem ? 'Simpan Perubahan' : 'Tambah Barang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
