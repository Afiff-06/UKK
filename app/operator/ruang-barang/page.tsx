"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Pencil, Trash2, HomeIcon, AlertCircle } from "lucide-react";
import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

interface Ruang {
    id_ruang: string;
    kode_ruang: number;
    nama_ruang: string;
    keterangan: string | null;
}

const supabase = createClient();

export default function RuangBarangPage() {
    const [items, setItems] = useState<Ruang[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Ruang | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nama_ruang: "",
        keterangan: "",
    });

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("ruang")
            .select("*")
            .order("kode_ruang", { ascending: true });
        if (data) setItems(data);
        if (error) console.error(error);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => setFormData({ nama_ruang: "", keterangan: "" });

    const openAdd = () => {
        setEditItem(null);
        resetForm();
        setError(null);
        setShowModal(true);
    };

    const openEdit = (item: Ruang) => {
        setEditItem(item);
        setFormData({ nama_ruang: item.nama_ruang, keterangan: item.keterangan || "" });
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
        if (!formData.nama_ruang.trim()) {
            setError("Nama ruang wajib diisi.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (editItem) {
                const { error } = await supabase
                    .from("ruang")
                    .update({ nama_ruang: formData.nama_ruang, keterangan: formData.keterangan || null })
                    .eq("id_ruang", editItem.id_ruang);
                if (error) throw error;
            } else {
                const { data: maxKode } = await supabase
                    .from("ruang")
                    .select("kode_ruang")
                    .order("kode_ruang", { ascending: false })
                    .limit(1);
                const nextKode = (maxKode?.[0]?.kode_ruang || 0) + 1;
                const { error } = await supabase
                    .from("ruang")
                    .insert({ nama_ruang: formData.nama_ruang, keterangan: formData.keterangan || null, kode_ruang: nextKode });
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
        if (!confirm(`Hapus ruang "${nama}"? Pastikan tidak ada inventaris yang berada di ruang ini.`)) return;
        const { error } = await supabase.from("ruang").delete().eq("id_ruang", id);
        if (error) {
            alert("Gagal menghapus. Mungkin ruang ini masih digunakan oleh inventaris.");
        } else {
            fetchData();
        }
    };

    const filtered = items.filter(item =>
        item.nama_ruang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode_ruang?.toString().includes(searchQuery)
    );

    return (
        <div className="min-h-screen bg-[#f5f7fb] w-full">
            <main className="flex-1 flex flex-col">
                <Header title="Ruang Barang" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-1 text-gray-800">Ruang Barang</h1>
                    <p className="text-gray-500 mb-6">Kelola lokasi penyimpanan barang inventaris</p>

                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                className="border rounded-xl pl-10 pr-4 py-2 w-64 bg-white"
                                placeholder="Cari ruang..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={openAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                        >
                            <Plus size={18} />
                            Tambah Ruang
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <HomeIcon className="mx-auto text-gray-300 mb-4" size={48} />
                                <p className="text-gray-500">
                                    {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada ruang yang didaftarkan"}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Kode</th>
                                        <th className="px-6 py-4 text-left">Nama Ruang</th>
                                        <th className="px-6 py-4 text-left">Keterangan</th>
                                        <th className="px-6 py-4 text-left">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map((item) => (
                                        <tr key={item.id_ruang} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                                RNG-{String(item.kode_ruang).padStart(3, "0")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                        <HomeIcon className="text-emerald-600" size={16} />
                                                    </div>
                                                    <span className="font-medium text-gray-800">{item.nama_ruang}</span>
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
                                                        onClick={() => handleDelete(item.id_ruang, item.nama_ruang)}
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
                                Menampilkan {filtered.length} dari {items.length} ruang
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
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <HomeIcon className="text-emerald-600" size={20} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800">
                                {editItem ? "Edit Ruang" : "Tambah Ruang"}
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
                                    Nama Ruang <span className="text-red-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Contoh: Gudang A, Lab Komputer..."
                                    value={formData.nama_ruang}
                                    onChange={(e) => setFormData({ ...formData, nama_ruang: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
                                </label>
                                <textarea
                                    className="w-full border rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Informasi tambahan tentang lokasi ruang ini..."
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
                                {editItem ? "Simpan Perubahan" : "Tambah Ruang"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}