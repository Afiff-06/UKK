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
import { getReturnStatus, isPastDueDate } from "@/lib/peminjaman-status";

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
        inventaris: { id_inventaris: string; nama: string; kode_inventaris: number; jumlah: number };
    }[];
}

export default function PengembalianPage() {
    const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
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
                        inventaris:id_inventaris (id_inventaris, nama, kode_inventaris, jumlah)
                    )
                `)
                .in('status', ['konfirmasi_pengembalian', 'dikembalikan', 'terlambat'])
                .order('tanggal_pinjam', { ascending: false });

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
            const pinjaman = peminjaman.find(p => p.id_peminjaman === id);
            const returnStatus = pinjaman
                ? getReturnStatus(pinjaman.tanggal_pinjam, pinjaman.tanggal_kembali)
                : 'dikembalikan';

            if (pinjaman) {
                // Kembalikan jumlah stok untuk setiap barang yang dipinjam
                for (const detail of pinjaman.detail_peminjaman) {
                    const inv = detail.inventaris;

                    // Fetch stok terkini
                    const { data: currentItem, error: fetchError } = await supabase
                        .from('inventaris')
                        .select('jumlah')
                        .eq('id_inventaris', inv.id_inventaris)
                        .single();

                    if (fetchError || !currentItem) {
                        console.error('Gagal mengambil stok:', inv.nama, fetchError);
                        continue;
                    }

                    // Tambahkan kembali jumlah yang dipinjam ke stok
                    const { error: updateError } = await supabase
                        .from('inventaris')
                        .update({ jumlah: currentItem.jumlah + detail.jumlah })
                        .eq('id_inventaris', inv.id_inventaris);

                    if (updateError) {
                        console.error('Gagal update stok:', inv.nama, updateError);
                    }
                }
            }

            // Update status peminjaman menjadi dikembalikan atau terlambat
            const { error } = await supabase
                .from('peminjaman')
                .update({
                    status: returnStatus
                })
                .eq('id_peminjaman', id);

            if (error) throw error;

            fetchPeminjaman();
        } catch (error) {
            console.error('Error processing return:', error);
            alert('Gagal memproses pengembalian. Silakan coba lagi.');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredPeminjaman = peminjaman.filter(item => {
        const pegawaiName = item.pegawai?.nama?.toLowerCase() || '';
        const itemsList = item.detail_peminjaman.map(d => d.inventaris?.nama?.toLowerCase()).join(' ');
        
        const matchesSearch = pegawaiName.includes(searchQuery.toLowerCase()) ||
            itemsList.includes(searchQuery.toLowerCase());
            
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'konfirmasi_pengembalian':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <RotateCcw size={14} /> Menunggu Konfirmasi Pengembalian
                    </span>
                );
            case 'dipinjam':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <CheckCircle size={14} /> Dipinjam
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        <Clock size={14} /> Pending
                    </span>
                );
            case 'dikembalikan':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        <CheckCircle size={14} /> Dikembalikan
                    </span>
                );
            case 'terlambat':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        <AlertTriangle size={14} /> Terlambat
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

    const isOverdue = (tanggalPinjam: string, tanggalKembali: string | null) =>
        isPastDueDate(tanggalPinjam, tanggalKembali);

    return (

        <div className="min-h-screen bg-[#f5f7fb] w-full">
            <main className="flex-1 flex flex-col">
                <Header title="Pengembalian" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Pengembalian Barang</h1>
                    <p className="text-gray-500 mb-6 font-medium">Kelola pengembalian barang yang dipinjam oleh pegawai</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-gray-100/50 border border-gray-50 flex items-center gap-5 transition-all hover:scale-[1.02]">
                            <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                                <Clock size={28} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-0.5">Menunggu Konfirmasi</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    {peminjaman.filter(p => p.status === 'konfirmasi_pengembalian').length}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-gray-100/50 border border-gray-50 flex items-center gap-5 transition-all hover:scale-[1.02]">
                            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                                <CheckCircle size={28} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-0.5">Selesai</p>
                                <p className="text-2xl font-bold text-gray-800">
                                    {peminjaman.filter(p => ['dikembalikan', 'terlambat'].includes(p.status)).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row justify-end gap-4 mb-6">
                        <select
                            className="border border-gray-200 rounded-2xl px-4 py-2 bg-white text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm font-medium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="konfirmasi_pengembalian">Menunggu Konfirmasi</option>
                            <option value="dikembalikan">Selesai</option>
                            <option value="terlambat">Terlambat</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                className="border border-gray-200 rounded-2xl pl-10 pr-4 py-2 w-full md:w-72 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                                placeholder="Cari peminjam atau barang..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-50">
                        {loading ? (
                            <div className="p-12">
                                <LoadingSpinner />
                            </div>
                        ) : filteredPeminjaman.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100">
                                    <RotateCcw className="text-gray-300" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak Ada Tagihan</h3>
                                <p className="text-gray-500">Tidak ada barang yang perlu dikonfirmasi saat ini.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-8 py-5 text-left border-b border-gray-50">Peminjam</th>
                                            <th className="px-8 py-5 text-left border-b border-gray-50">Barang</th>
                                            <th className="px-8 py-5 text-left border-b border-gray-50">Tanggal Pinjam</th>
                                            <th className="px-8 py-5 text-left border-b border-gray-50">Status</th>
                                            <th className="px-8 py-5 text-center border-b border-gray-50">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-50">
                                        {filteredPeminjaman
                                            .map((item) => (
                                            <tr key={item.id_peminjaman} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-sm">
                                                            {item.pegawai?.nama?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">
                                                                {item.pegawai?.nama || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-gray-400 font-medium tracking-tight">
                                                                {item.pegawai?.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="space-y-1.5 text-sm">
                                                        {item.detail_peminjaman.map((detail) => (
                                                            <div key={detail.id} className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                                <span className="font-bold text-gray-800">
                                                                    {detail.inventaris?.nama}
                                                                </span>
                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                                                    x{detail.jumlah}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-bold text-gray-700">
                                                    <div>
                                                        <p>
                                                            {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        {isOverdue(item.tanggal_pinjam, item.tanggal_kembali) && (
                                                            <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-bold">
                                                                <AlertTriangle size={10} /> Terlambat
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                    <td className="px-8 py-5">
                                                        {getStatusBadge(item.status)}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex justify-center">
                                                            {item.status === 'konfirmasi_pengembalian' ? (
                                                                <button
                                                                    onClick={() => handleReturn(item.id_peminjaman)}
                                                                    disabled={processingId === item.id_peminjaman}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-green-100 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
                                                                >
                                                                    {processingId === item.id_peminjaman ? (
                                                                        <LoadingSpinner size="sm" />
                                                                    ) : (
                                                                        <CheckCircle size={18} />
                                                                    )}
                                                                    Konfirmasi Kembali
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400 text-sm italic font-medium">Selesai</span>
                                                            )}
                                                        </div>
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
