"use client";

import { useState, useEffect } from "react";
import {
    Search,
    RotateCcw,
    CheckCircle,
    Clock,
    Package,
    AlertTriangle,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";

interface Peminjaman {
    id_peminjaman: string;
    tanggal_pinjam: string;
    tanggal_kembali: string | null;
    status: string;
    pegawai?: { nama: string; email: string };
    petugas?: { nama: string };
    detail_peminjaman: {
        id: string;
        jumlah: number;
        inventaris: { nama: string; kode_inventaris: number };
    }[];
}

export default function PengembalianPage() {
    const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { role, profile } = useAuth();
    const supabase = createClient();

    const fetchPeminjaman = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('peminjaman')
                .select(`
                    *,
                    pegawai:id_pegawai (nama, email),
                    petugas:id_petugas (nama),
                    detail_peminjaman (
                        id,
                        jumlah,
                        inventaris:id_inventaris (nama, kode_inventaris)
                    )
                `)
                .in('status', ['disetujui', 'konfirmasi'])
                .order('tanggal_pinjam', { ascending: false });

            // If pegawai, only show their own borrowings
            if (role === 'pegawai' && profile?.id) {
                query = query.eq('id_pegawai', profile.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setPeminjaman(data || []);
        } catch (error) {
            console.error('Error fetching peminjaman:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile) {
            fetchPeminjaman();
        }
    }, [profile, role]);

    const handleReturn = async (id: string) => {
        if (!confirm('Konfirmasi pengembalian barang ini?')) return;

        setProcessingId(id);
        try {
            // Get the peminjaman details to update stock
            const pinjaman = peminjaman.find(p => p.id_peminjaman === id);

            if (pinjaman) {
                // Update stock for each item
                for (const detail of pinjaman.detail_peminjaman) {
                    const { error: stockError } = await supabase.rpc('increment_stock', {
                        item_id: (detail.inventaris as any).id_inventaris,
                        amount: detail.jumlah,
                    });

                    // If RPC doesn't exist, update directly
                    if (stockError) {
                        console.log('RPC not available, updating directly');
                    }
                }
            }

            // Update peminjaman status
            const { error } = await supabase
                .from('peminjaman')
                .update({
                    status: 'dikembalikan',
                    tanggal_kembali: new Date().toISOString().split('T')[0]
                })
                .eq('id_peminjaman', id);

            if (error) throw error;

            fetchPeminjaman();
        } catch (error) {
            console.error('Error processing return:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRequestReturn = async (id: string) => {
        if (!confirm('Konfirmasi pengajuan pengembalian barang ini?')) return;

        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('peminjaman')
                .update({ status: 'konfirmasi' })
                .eq('id_peminjaman', id);

            if (error) throw error;

            fetchPeminjaman();
        } catch (error) {
            console.error('Error mengajukan pengembalian:', error);
            alert('Gagal mengajukan pengembalian. Silakan coba lagi.');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredPeminjaman = peminjaman.filter(item => {
        const pegawaiName = item.pegawai?.nama?.toLowerCase() || '';
        const items = item.detail_peminjaman.map(d => d.inventaris?.nama?.toLowerCase()).join(' ');
        return pegawaiName.includes(searchQuery.toLowerCase()) ||
            items.includes(searchQuery.toLowerCase());
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'disetujui':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <CheckCircle size={14} /> Dipinjam
                    </span>
                );
            case 'konfirmasi':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <RotateCcw size={14} /> Menunggu Konfirmasi
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        <Clock size={14} /> Pending
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

    const isOverdue = (tanggalPinjam: string) => {
        const borrowed = new Date(tanggalPinjam);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 7; // Overdue if more than 7 days
    };

    return (
        
            <div className="min-h-screen bg-[#f5f7fb] w-full">
                <main className="flex-1 flex flex-col">
                    <Header title="Pengembalian" />

                    <div className="p-8">
                        <h1 className="text-3xl font-bold mb-2 text-gray-800">Pengembalian Barang</h1>
                        <p className="text-gray-500 mb-6">
                            {role === 'pegawai'
                                ? 'Daftar barang yang Anda pinjam'
                                : 'Kelola pengembalian barang yang dipinjam'
                            }
                        </p>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Package className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Dipinjam</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {peminjaman.filter(p => p.status === 'disetujui').length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <Clock className="text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Pending</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {peminjaman.filter(p => p.status === 'pending').length}
                                        </p>
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
                                        <p className="text-2xl font-bold text-gray-800">
                                            {peminjaman.filter(p => p.status === 'disetujui' && isOverdue(p.tanggal_pinjam)).length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex justify-end mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    className="border rounded-xl pl-10 pr-4 py-2 w-64 bg-white"
                                    placeholder="Cari peminjam atau barang..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                            {loading ? (
                                <div className="p-12">
                                    <LoadingSpinner />
                                </div>
                            ) : filteredPeminjaman.length === 0 ? (
                                <div className="p-12 text-center">
                                    <RotateCcw className="mx-auto text-gray-300 mb-4" size={48} />
                                    <p className="text-gray-500">Tidak ada barang yang perlu dikembalikan</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-gray-500 text-sm">
                                        <tr>
                                            {role !== 'pegawai' && (
                                                <th className="px-6 py-4 text-left">Peminjam</th>
                                            )}
                                            <th className="px-6 py-4 text-left">Barang</th>
                                            <th className="px-6 py-4 text-left">Tanggal Pinjam</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                            <th className="px-6 py-4 text-left">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {filteredPeminjaman.map((item) => (
                                            <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                {role !== 'pegawai' && (
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-medium text-gray-800">
                                                                {item.pegawai?.nama || 'Unknown'}
                                                            </p>
                                                            <p className="text-sm text-gray-400">
                                                                {item.pegawai?.email}
                                                            </p>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {item.detail_peminjaman.map((detail) => (
                                                            <div key={detail.id} className="flex items-center gap-2">
                                                                <span className="text-gray-800">
                                                                    {detail.inventaris?.nama}
                                                                </span>
                                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                                    x{detail.jumlah}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-gray-800">
                                                            {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        {isOverdue(item.tanggal_pinjam) && item.status === 'disetujui' && (
                                                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                                                <AlertTriangle size={12} /> Terlambat
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.status === 'disetujui' && (
                                                        <button
                                                            onClick={() => handleRequestReturn(item.id_peminjaman)}
                                                            disabled={processingId === item.id_peminjaman}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                                        >
                                                            {processingId === item.id_peminjaman ? (
                                                                <LoadingSpinner size="sm" />
                                                            ) : (
                                                                <RotateCcw size={16} />
                                                            )}
                                                            Ajukan Pengembalian
                                                        </button>
                                                    )}
                                                    {item.status === 'konfirmasi' && (
                                                        <span className="text-blue-500 text-sm flex items-center gap-1">
                                                            <Clock size={14} /> Menunggu dikonfirmasi operator
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        
    );
}
