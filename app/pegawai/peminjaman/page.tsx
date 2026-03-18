"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import {
    Plus,
    Minus,
    ChevronDown,
    Trash2,
    Search,
    Check,
    X,
    Package,
    Clock,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";

interface Inventaris {
    id_inventaris: string;
    nama: string;
    jumlah: number;
    kode_inventaris: number;
}

interface User {
    id: string;
    nama: string;
    email: string;
}

interface SelectedItem {
    id_inventaris: string;
    nama: string;
    qty: number;
    maxQty: number;
}

interface RiwayatPeminjaman {
    id_peminjaman: string;
    tanggal_pinjam: string;
    tanggal_kembali: string | null;
    status: string;
    pegawai?: { nama: string; email: string };
    detail_peminjaman: {
        id: string;
        jumlah: number;
        inventaris: { nama: string; kode_inventaris: number };
    }[];
}

interface RiwayatPeminjamanRow {
    id_peminjaman: string;
    tanggal_pinjam: string;
    tanggal_kembali: string | null;
    status: string;
    pegawai?: { nama: string; email: string }[] | null;
    detail_peminjaman?: {
        id: string;
        jumlah: number;
        inventaris?: { nama: string; kode_inventaris: number }[] | null;
    }[] | null;
}

export default function Peminjaman() {
    const [items, setItems] = useState<SelectedItem[]>([]);
    const [inventaris, setInventaris] = useState<Inventaris[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [riwayatPeminjaman, setRiwayatPeminjaman] = useState<RiwayatPeminjaman[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState<User | null>(null);
    const [tanggalPinjam, setTanggalPinjam] = useState("");
    const [showItemSelector, setShowItemSelector] = useState(false);
    const [showPegawaiSelector, setShowPegawaiSelector] = useState(false);
    const [searchItem, setSearchItem] = useState("");
    const [searchPegawai, setSearchPegawai] = useState("");

    const { role, profile } = useAuth();
    const supabase = createClient();

    const isOverdue = (tanggalPinjam: string, status: string) => {
        if (status !== "disetujui") return false;

        const borrowed = new Date(tanggalPinjam);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    };

    const getStatusBadge = (status: string, tanggalPinjam: string) => {
        if (isOverdue(tanggalPinjam, status)) {
            return (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    <AlertTriangle size={14} /> Terlambat
                </span>
            );
        }

        switch (status) {
            case "pending":
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        <Clock size={14} /> Menunggu
                    </span>
                );
            case "disetujui":
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <CheckCircle2 size={14} /> Dipinjam
                    </span>
                );
            case "dikembalikan":
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <CheckCircle2 size={14} /> Dikembalikan
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {status}
                    </span>
                );
        }
    };

    const fetchRiwayatPeminjaman = useCallback(async (currentRole = role, currentProfile = profile) => {
        try {
            let query = supabase
                .from("peminjaman")
                .select(`
                    id_peminjaman,
                    tanggal_pinjam,
                    tanggal_kembali,
                    status,
                    pegawai:id_pegawai (nama, email),
                    detail_peminjaman (
                        id,
                        jumlah,
                        inventaris:id_inventaris (nama, kode_inventaris)
                    )
                `)
                .order("tanggal_pinjam", { ascending: false });

            if (currentRole === "pegawai" && currentProfile?.id) {
                query = query.eq("id_pegawai", currentProfile.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            const riwayat = ((data || []) as RiwayatPeminjamanRow[]).map((item) => ({
                id_peminjaman: item.id_peminjaman,
                tanggal_pinjam: item.tanggal_pinjam,
                tanggal_kembali: item.tanggal_kembali,
                status: item.status,
                pegawai: item.pegawai?.[0]
                    ? {
                        nama: item.pegawai[0].nama,
                        email: item.pegawai[0].email,
                    }
                    : undefined,
                detail_peminjaman: (item.detail_peminjaman || []).map((detail) => ({
                    id: detail.id,
                    jumlah: detail.jumlah,
                    inventaris: {
                        nama: detail.inventaris?.[0]?.nama || "",
                        kode_inventaris: detail.inventaris?.[0]?.kode_inventaris || 0,
                    },
                })),
            }));

            setRiwayatPeminjaman(riwayat);
        } catch (error) {
            console.error("Error fetching riwayat peminjaman:", error);
        }
    }, [profile, role, supabase]);

    // Initialize date on client side to avoid Next.js 16 prerender issues
    useEffect(() => {
        if (!tanggalPinjam) {
            setTanggalPinjam(new Date().toISOString().split('T')[0]);
        }
    }, [tanggalPinjam]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch inventaris
                const { data: invData } = await supabase
                    .from('inventaris')
                    .select('id_inventaris, nama, jumlah, kode_inventaris')
                    .gt('jumlah', 0)
                    .order('nama');

                // Fetch users (pegawai) from tb_user
                const { data: usrData } = await supabase
                    .from('tb_user')
                    .select('id, nama, email')
                    .eq('role', 'pegawai');

                if (invData) setInventaris(invData);
                if (usrData) setUsers(usrData);

                // If pegawai, auto-select themselves
                if (role === 'pegawai' && profile) {
                    setSelectedPegawai({
                        id: profile.id,
                        nama: profile.nama,
                        email: profile.email || '',
                    });
                }

                await fetchRiwayatPeminjaman(role, profile);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [fetchRiwayatPeminjaman, profile, role, supabase]);

    const updateQty = (id: string, delta: number) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id_inventaris === id
                    ? { ...item, qty: Math.max(1, Math.min(item.maxQty, item.qty + delta)) }
                    : item
            )
        );
    };

    const addItem = (inv: Inventaris) => {
        if (items.find(i => i.id_inventaris === inv.id_inventaris)) {
            return; // Already added
        }
        setItems([...items, {
            id_inventaris: inv.id_inventaris,
            nama: inv.nama,
            qty: 1,
            maxQty: inv.jumlah,
        }]);
        setShowItemSelector(false);
        setSearchItem("");
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id_inventaris !== id));
    };

    const handleSubmit = async () => {
        if (!selectedPegawai || items.length === 0) {
            alert('Pilih pegawai dan tambahkan barang terlebih dahulu');
            return;
        }

        setSubmitting(true);
        try {
            // Create peminjaman
            const { data: peminjaman, error: peminjamanError } = await supabase
                .from('peminjaman')
                .insert({
                    id_pegawai: selectedPegawai.id,
                    id_petugas: profile?.id,
                    tanggal_pinjam: tanggalPinjam,
                    status: role === 'pegawai' ? 'pending' : 'disetujui',
                })
                .select()
                .single();

            if (peminjamanError) throw peminjamanError;

            // Create detail peminjaman
            const details = items.map(item => ({
                id_peminjaman: peminjaman.id_peminjaman,
                id_inventaris: item.id_inventaris,
                jumlah: item.qty,
            }));

            const { error: detailError } = await supabase
                .from('detail_peminjaman')
                .insert(details);

            if (detailError) throw detailError;

            // Update stock if approved
            if (role !== 'pegawai') {
                for (const item of items) {
                    const { error: stockError } = await supabase
                        .from('inventaris')
                        .update({ jumlah: inventaris.find(i => i.id_inventaris === item.id_inventaris)!.jumlah - item.qty })
                        .eq('id_inventaris', item.id_inventaris);

                    if (stockError) console.error('Stock update error:', stockError);
                }
            }

            alert(role === 'pegawai' ? 'Peminjaman berhasil diajukan dan menunggu persetujuan.' : 'Peminjaman berhasil diproses.');

            // Reset form
            setItems([]);
            if (role !== 'pegawai') {
                setSelectedPegawai(null);
            }

            // Refresh inventaris
            const { data: invData } = await supabase
                .from('inventaris')
                .select('id_inventaris, nama, jumlah, kode_inventaris')
                .gt('jumlah', 0)
                .order('nama');
            if (invData) setInventaris(invData);
            await fetchRiwayatPeminjaman();

        } catch (error) {
            console.error('Error creating peminjaman:', error);
            alert('Gagal membuat peminjaman');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredInventaris = inventaris.filter(inv =>
        inv.nama.toLowerCase().includes(searchItem.toLowerCase()) &&
        !items.find(i => i.id_inventaris === inv.id_inventaris)
    );

    const filteredUsers = users.filter(usr =>
        usr.nama.toLowerCase().includes(searchPegawai.toLowerCase()) ||
        usr.email.toLowerCase().includes(searchPegawai.toLowerCase())
    );

    const jumlahMenunggu = riwayatPeminjaman.filter((item) => item.status === "pending").length;
    const jumlahTerlambat = riwayatPeminjaman.filter((item) => isOverdue(item.tanggal_pinjam, item.status)).length;
    const jumlahAktif = riwayatPeminjaman.filter((item) => ["pending", "disetujui"].includes(item.status)).length;

    if (loading) {
        return (
            
                <div className="min-h-screen bg-[#f5f7fb] w-full flex items-center justify-center">
                    <LoadingSpinner size="lg" />
                </div>
            
        );
    }

    return (
        
            <div className="min-h-screen bg-[#f5f7fb] w-full">
                <main className="flex-1 flex flex-col">
                    <Header title="Peminjaman" />

                    <div className="p-8">
                        <h1 className="text-3xl font-bold mb-2 text-gray-800">
                            {role === 'pegawai' ? 'Ajukan Peminjaman' : 'Form Peminjaman Barang'}
                        </h1>
                        <p className="text-gray-500 mb-6">
                            {role === 'pegawai'
                                ? 'Ajukan peminjaman barang ke operator'
                                : 'Proses peminjaman barang untuk pegawai'
                            }
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl">
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Package className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Peminjaman Aktif</p>
                                        <p className="text-2xl font-bold text-gray-800">{jumlahAktif}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <Clock className="text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Menunggu</p>
                                        <p className="text-2xl font-bold text-gray-800">{jumlahMenunggu}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Terlambat</p>
                                        <p className="text-2xl font-bold text-gray-800">{jumlahTerlambat}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-lg p-8 space-y-8 max-w-4xl">
                            {/* PILIH PEGAWAI */}
                            {role !== 'pegawai' && (
                                <Section title="Pilih Pegawai" icon="👤">
                                    <div
                                        onClick={() => setShowPegawaiSelector(true)}
                                        className="border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        {selectedPegawai ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                                                    {selectedPegawai.nama.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{selectedPegawai.nama}</p>
                                                    <p className="text-sm text-gray-400">{selectedPegawai.email}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Pilih pegawai...</span>
                                        )}
                                        <ChevronDown className="text-gray-400" />
                                    </div>

                                    {/* Pegawai Selector Dropdown */}
                                    {showPegawaiSelector && (
                                        <div className="mt-2 border rounded-xl shadow-lg bg-white max-h-64 overflow-hidden">
                                            <div className="p-3 border-b">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                    <input
                                                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                                        placeholder="Cari pegawai..."
                                                        value={searchPegawai}
                                                        onChange={(e) => setSearchPegawai(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredUsers.map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => {
                                                            setSelectedPegawai(user);
                                                            setShowPegawaiSelector(false);
                                                            setSearchPegawai("");
                                                        }}
                                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                                            {user.nama.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{user.nama}</p>
                                                            <p className="text-xs text-gray-400">{user.email}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredUsers.length === 0 && (
                                                    <p className="px-4 py-3 text-gray-400 text-sm text-center">Tidak ditemukan</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Section>
                            )}

                            {/* PILIH BARANG */}
                            <Section title="Pilih Barang & Jumlah" icon="📦">
                                <div className="border rounded-2xl overflow-hidden">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 bg-gray-50 px-6 py-3 text-sm text-gray-500">
                                        <div className="col-span-7">Barang</div>
                                        <div className="col-span-3">Jumlah</div>
                                        <div className="col-span-2"></div>
                                    </div>

                                    {/* Items */}
                                    {items.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-400">
                                            <Package className="mx-auto mb-2" size={32} />
                                            <p>Belum ada barang dipilih</p>
                                        </div>
                                    ) : (
                                        items.map((item) => (
                                            <div
                                                key={item.id_inventaris}
                                                className="grid grid-cols-12 items-center px-6 py-4 border-t"
                                            >
                                                <div className="col-span-7 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <Package className="text-blue-600" size={18} />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-800">{item.nama}</span>
                                                        <p className="text-xs text-gray-400">Stok: {item.maxQty}</p>
                                                    </div>
                                                </div>

                                                <div className="col-span-3 flex items-center gap-2">
                                                    <div className="flex items-center border rounded-lg overflow-hidden">
                                                        <button
                                                            onClick={() => updateQty(item.id_inventaris, -1)}
                                                            className="px-3 py-2 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <div className="px-4 font-medium">{item.qty}</div>
                                                        <button
                                                            onClick={() => updateQty(item.id_inventaris, 1)}
                                                            className="px-3 py-2 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="col-span-2 flex justify-end">
                                                    <button
                                                        onClick={() => removeItem(item.id_inventaris)}
                                                        className="border px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* Add Item Button */}
                                    <div className="p-4 border-t">
                                        <button
                                            onClick={() => setShowItemSelector(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Plus size={16} />
                                            Tambah Barang
                                        </button>
                                    </div>
                                </div>

                                {/* Item Selector Modal */}
                                {showItemSelector && (
                                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                                            <div className="p-4 border-b flex items-center justify-between">
                                                <h3 className="font-semibold">Pilih Barang</h3>
                                                <button onClick={() => {
                                                    setShowItemSelector(false);
                                                    setSearchItem("");
                                                }}>
                                                    <X className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div className="p-4 border-b">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                                    <input
                                                        className="w-full pl-9 pr-4 py-2 border rounded-lg"
                                                        placeholder="Cari barang..."
                                                        value={searchItem}
                                                        onChange={(e) => setSearchItem(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredInventaris.map(inv => (
                                                    <div
                                                        key={inv.id_inventaris}
                                                        onClick={() => addItem(inv)}
                                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                                                <Package className="text-blue-600" size={14} />
                                                            </div>
                                                            <span className="font-medium">{inv.nama}</span>
                                                        </div>
                                                        <span className="text-sm text-gray-400">Stok: {inv.jumlah}</span>
                                                    </div>
                                                ))}
                                                {filteredInventaris.length === 0 && (
                                                    <p className="px-4 py-8 text-gray-400 text-center">Tidak ada barang tersedia</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Section>

                            {/* TANGGAL */}
                            <Section title="Tanggal Pinjam" icon="📅">
                                <div className="relative max-w-xs">
                                    <input
                                        type="date"
                                        value={tanggalPinjam}
                                        onChange={(e) => setTanggalPinjam(e.target.value)}
                                        className="w-full border rounded-xl px-4 py-3"
                                    />
                                </div>
                            </Section>

                            {/* ACTION */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setItems([]);
                                        if (role !== 'pegawai') setSelectedPegawai(null);
                                    }}
                                    className="px-6 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || items.length === 0 || (!selectedPegawai && role !== 'pegawai')}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting ? <LoadingSpinner size="sm" /> : <Check size={18} />}
                                    {role === 'pegawai' ? 'Ajukan Peminjaman' : 'Proses Peminjaman'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mt-8 max-w-4xl">
                            <div className="px-8 py-6 border-b">
                                <h2 className="text-2xl font-semibold text-gray-800">Riwayat Peminjaman</h2>
                                <p className="text-sm text-gray-500 mt-1">Pantau status pengajuan, barang aktif, dan pinjaman yang sudah terlambat.</p>
                            </div>

                            {riwayatPeminjaman.length === 0 ? (
                                <div className="px-8 py-12 text-center text-gray-400">
                                    <Package className="mx-auto mb-3" size={36} />
                                    <p>Belum ada riwayat peminjaman</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-sm text-gray-500">
                                            <tr>
                                                <th className="px-6 py-4 text-left">Barang</th>
                                                <th className="px-6 py-4 text-left">Tanggal Pinjam</th>
                                                <th className="px-6 py-4 text-left">Tanggal Kembali</th>
                                                <th className="px-6 py-4 text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {riwayatPeminjaman.map((item) => (
                                                <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-gray-700">
                                                        {item.detail_peminjaman.map((detail) => detail.inventaris?.nama).join(", ") || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">
                                                        {new Date(item.tanggal_pinjam).toLocaleDateString("id-ID", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">
                                                        {item.tanggal_kembali
                                                            ? new Date(item.tanggal_kembali).toLocaleDateString("id-ID", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric",
                                                            })
                                                            : "-"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(item.status, item.tanggal_pinjam)}
                                                    </td>
                                                </tr>
                                            ))}
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

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 font-semibold text-gray-700">
                <span>{icon}</span>
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}
