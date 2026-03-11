"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    X,
    Pencil,
    Trash2,
    Package,
    AlertCircle,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

interface Inventaris {
    id_inventaris: string;
    kode_inventaris: number;
    nama: string;
    jumlah: number;
    kondisi: string;
    keterangan: string;
    id_jenis: string;
    id_ruang: string;
    tanggal_register: string;
    jenis?: { nama_jenis: string };
    ruang?: { nama_ruang: string };
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

    const fetchData = async () => {
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
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const handleEdit = (item: Inventaris) => {
        setEditItem(item);
        setFormData({
            nama: item.nama,
            jumlah: item.jumlah,
            kondisi: item.kondisi,
            keterangan: item.keterangan || "",
            id_jenis: item.id_jenis || "",
            id_ruang: item.id_ruang || "",
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

    const filteredItems = items.filter(item => {
        const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.kode_inventaris.toString().includes(searchQuery);
        const matchKondisi = !filterKondisi || item.kondisi === filterKondisi;
        return matchSearch && matchKondisi;
    });

    const getKondisiBadge = (kondisi: string) => {
        const colors: Record<string, string> = {
            'Baik': 'bg-green-100 text-green-700',
            'Rusak Ringan': 'bg-yellow-100 text-yellow-700',
            'Rusak Berat': 'bg-red-100 text-red-700',
        };
        return colors[kondisi] || 'bg-gray-100 text-gray-700';
    };

    return (
        
            <div className="min-h-screen bg-[#f5f7fb] w-full">
                <main className="flex-1 flex flex-col">
                    <Header title="Inventaris Barang" />

                    <div className="p-8">
                        <h1 className="text-3xl font-bold mb-2 text-gray-800">Inventaris Barang</h1>
                        <p className="text-gray-500 mb-6">Kelola data barang inventaris</p>

                        {/* Filters & Actions */}
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <div className="flex gap-3">
                                <select
                                    value={filterKondisi}
                                    onChange={(e) => setFilterKondisi(e.target.value)}
                                    className="border rounded-xl px-4 py-2 bg-white"
                                >
                                    <option value="">Semua Kondisi</option>
                                    <option value="Baik">Baik</option>
                                    <option value="Rusak Ringan">Rusak Ringan</option>
                                    <option value="Rusak Berat">Rusak Berat</option>
                                </select>
                            </div>

                            <div className="flex gap-3 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        className="border rounded-xl pl-10 pr-4 py-2 w-64 bg-white"
                                        placeholder="Cari barang..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={openAddModal}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                                >
                                    <Plus size={18} />
                                    Tambah Barang
                                </button>
                            </div>
                        </div>

                        {/* Table */}
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
                                            <th className="px-6 py-4 text-left">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {filteredItems.map((item) => (
                                            <tr key={item.id_inventaris} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-mono text-sm">
                                                    INV-{String(item.kode_inventaris).padStart(4, '0')}
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
                                                    {item.jenis?.nama_jenis || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {item.ruang?.nama_ruang || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`font-semibold ${item.jumlah <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                                                        {item.jumlah}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm ${getKondisiBadge(item.kondisi)}`}>
                                                        {item.kondisi}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id_inventaris)}
                                                            className="border px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
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
                                            min="1"
                                            className="w-full border rounded-xl px-4 py-3"
                                            value={formData.jumlah}
                                            onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 1 })}
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
