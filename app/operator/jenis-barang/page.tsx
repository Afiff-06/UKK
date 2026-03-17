"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Pencil, Trash2, Box, AlertCircle } from "lucide-react";
import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

interface Jenis {
    id_jenis: string;
    kode_jenis: number;
    nama_jenis: string;
    keterangan: string | null;
}

const supabase = createClient();

export default function JenisBarangPage() {
    const [items, setItems] = useState<Jenis[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Jenis | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nama_jenis: "",
        keterangan: "",
    });

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("jenis")
            .select("*")
            .order("kode_jenis", { ascending: true });
        if (data) setItems(data);
        if (error) console.error(error);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => setFormData({ nama_jenis: "", keterangan: "" });

    const openAdd = () => {
        setEditItem(null);
        resetForm();
        setError(null);
        setShowModal(true);
    };

    const openEdit = (item: Jenis) => {
        setEditItem(item);
        setFormData({ nama_jenis: item.nama_jenis, keterangan: item.keterangan || "" });
        setError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
        resetForm();
        setError(null);
    };

    const handleSubmit = async () => {
        if (!formData.nama_jenis.trim()) {
            setError("Nama jenis wajib diisi.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (editItem) {
                const { error } = await supabase
                    .from("jenis")
                    .update({ nama_jenis: formData.nama_jenis, keterangan: formData.keterangan || null })
                    .eq("id_jenis", editItem.id_jenis);
                if (error) throw error;
            } else {
                const { data: maxKode } = await supabase
                    .from("jenis")
                    .select("kode_jenis")
                    .order("kode_jenis", { ascending: false })
                    .limit(1);
                const nextKode = (maxKode?.[0]?.kode_jenis || 0) + 1;
                const { error } = await supabase
                    .from("jenis")
                    .insert({ nama_jenis: formData.nama_jenis, keterangan: formData.keterangan || null, kode_jenis: nextKode });
                if (error) throw error;
            }
            closeModal();
            fetchData();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Gagal menyimpan data.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, nama: string) => {
        if (!confirm(`Hapus jenis "${nama}"? Pastikan tidak ada inventaris yang menggunakan jenis ini.`)) return;
        const { error } = await supabase.from("jenis").delete().eq("id_jenis", id);
        if (error) {
            alert("Gagal menghapus. Mungkin jenis ini masih digunakan oleh inventaris.");
        } else {
            fetchData();
        }
    };

    const filtered = items.filter(item =>
        item.nama_jenis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode_jenis?.toString().includes(searchQuery)
    );

    return (
        <div className="min-h-screen bg-[#f5f7fb] w-full">
            <main className="flex-1 flex flex-col">
                <Header title="Jenis Barang" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-1 text-gray-800">Jenis Barang</h1>
                    <p className="text-gray-500 mb-6">Kelola kategori jenis barang inventaris</p>

                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                className="border rounded-xl pl-10 pr-4 py-2 w-64 bg-white"
                                placeholder="Cari jenis barang..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={openAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                        >
                            <Plus size={18} />
                            Tambah Jenis
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <Box className="mx-auto text-gray-300 mb-4" size={48} />
                                <p className="text-gray-500">
                                    {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada jenis barang"}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Kode</th>
                                        <th className="px-6 py-4 text-left">Nama Jenis</th>
                                        <th className="px-6 py-4 text-left">Keterangan</th>
                                        <th className="px-6 py-4 text-left">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map((item) => (
                                        <tr key={item.id_jenis} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                                JNS-{String(item.kode_jenis).padStart(3, "0")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                        <Box className="text-indigo-600" size={16} />
                                                    </div>
                                                    <span className="font-medium text-gray-800">{item.nama_jenis}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {item.keterangan || <span className="text-gray-300 italic">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id_jenis, item.nama_jenis)}
                                                        className="border px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Hapus"
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

                        {!loading && filtered.length > 0 && (
                            <div className="px-6 py-4 border-t text-sm text-gray-400">
                                Menampilkan {filtered.length} dari {items.length} jenis barang
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Box className="text-indigo-600" size={20} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">
                                {editItem ? "Edit Jenis Barang" : "Tambah Jenis Barang"}
                            </h2>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Jenis <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Contoh: Elektronik, Furnitur..."
                                    value={formData.nama_jenis}
                                    onChange={(e) => setFormData({ ...formData, nama_jenis: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
                                </label>
                                <textarea
                                    className="w-full border rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Deskripsi singkat tentang jenis ini..."
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeModal}
                                className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving && <LoadingSpinner size="sm" />}
                                {editItem ? "Simpan Perubahan" : "Tambah Jenis"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}