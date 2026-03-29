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
    jam_pinjam: string | null;
    tanggal_kembali: string | null;
    jam_kembali: string | null;
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
                    id_peminjaman,
                    tanggal_pinjam,
                    jam_pinjam,
                    tanggal_kembali,
                    jam_kembali,
                    status,
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

            // If pegawai, only show their own borrowings
            if (role === 'pegawai' && profile?.id) {
                query = query.eq('id_pegawai', profile.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            const formattedData: Peminjaman[] = (data as any[]).map(item => ({
                id_peminjaman: item.id_peminjaman,
                tanggal_pinjam: item.tanggal_pinjam,
                jam_pinjam: item.jam_pinjam,
                tanggal_kembali: item.tanggal_kembali,
                jam_kembali: item.jam_kembali,
                status: item.status,
                pegawai: Array.isArray(item.pegawai) ? item.pegawai[0] : item.pegawai,
                petugas: Array.isArray(item.petugas) ? item.petugas[0] : item.petugas,
                detail_peminjaman: (item.detail_peminjaman || []).map((d: any) => ({
                    id: d.id,
                    jumlah: d.jumlah,
                    inventaris: Array.isArray(d.inventaris) ? d.inventaris[0] : d.inventaris
                }))
            }));

            setPeminjaman(formattedData);
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
                    const inv = detail.inventaris as { id_inventaris: string; jumlah: number; nama: string; kode_inventaris: number };

                    // Fetch stok terkini terlebih dahulu
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
                    status: returnStatus,
                    tanggal_kembali: new Date().toISOString().split('T')[0],
                    jam_kembali: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
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

    const handleRequestReturn = async (id: string) => {
        // For pegawai - just mark as pending return (could add a status for this)
        alert('Permintaan pengembalian telah diajukan. Silakan serahkan barang ke operator.');
    };

    const filteredPeminjaman = peminjaman.filter(item => {
        const pegawaiName = item.pegawai?.nama?.toLowerCase() || '';
        const items = item.detail_peminjaman.map(d => d.inventaris?.nama?.toLowerCase()).join(' ');
        
        const matchesSearch = pegawaiName.includes(searchQuery.toLowerCase()) ||
            items.includes(searchQuery.toLowerCase());
            
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
                    <p className="text-gray-500 mb-6">Konfirmasi pengembalian barang dari pegawai</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                    <Clock className="text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Menunggu Konfirmasi</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {peminjaman.filter(p => ["pending", "konfirmasi_pengembalian"].includes(p.status)).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Selesai</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {peminjaman.filter(p => ['dikembalikan', 'terlambat'].includes(p.status)).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row justify-end gap-4 mb-6">
                        <select
                            className="border rounded-xl px-4 py-2 bg-white text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="konfirmasi_pengembalian">Menunggu Konfirmasi</option>
                            <option value="dikembalikan">Selesai</option>
                            <option value="terlambat">Terlambat</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                className="border rounded-xl pl-10 pr-4 py-2 w-full md:w-64 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
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
                                        {filteredPeminjaman
                                            .map((item) => (
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
                                                        <div className="flex flex-col">
                                                            <p className="text-gray-800">
                                                                {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                            {item.jam_pinjam && (
                                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                    <Clock size={12} /> {item.jam_pinjam.slice(0, 5)}
                                                                </p>
                                                            )}
                                                            {isOverdue(item.tanggal_pinjam, item.tanggal_kembali) && (
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
                                                        {item.status === 'konfirmasi_pengembalian' ? (
                                                            <button
                                                                onClick={() => handleReturn(item.id_peminjaman)}
                                                                disabled={processingId === item.id_peminjaman}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 w-full justify-center"
                                                            >
                                                                {processingId === item.id_peminjaman ? (
                                                                    <LoadingSpinner size="sm" />
                                                                ) : (
                                                                    <CheckCircle size={16} />
                                                                )}
                                                                Konfirmasi Kembali
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm italic">Tidak ada aksi</span>
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
