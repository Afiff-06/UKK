"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Package,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Search,
    Plus,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getReturnStatus, isPastDueDate } from "@/lib/peminjaman-status";

interface RiwayatPeminjaman {
    id_peminjaman: string;
    tanggal_pinjam: string;
    jam_pinjam: string | null;
    tanggal_kembali: string | null;
    jam_kembali: string | null;
    status: string;
    pegawai?: { nama: string; email: string };
    detail_peminjaman: {
        id: string;
        jumlah: number;
        inventaris: { id_inventaris: string; nama: string; kode_inventaris: number };
    }[];
}

export default function PeminjamanPage() {
    const [riwayatPeminjaman, setRiwayatPeminjaman] = useState<RiwayatPeminjaman[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const router = useRouter();

    const { role } = useAuth();
    const supabase = createClient();

    const isOverdue = (tanggalPinjam: string, tanggalKembali: string | null, status: string) => {
        if (status !== "dipinjam") return false;
        return isPastDueDate(tanggalPinjam, tanggalKembali);
    };

    const getStatusBadge = (status: string, tanggalPinjam: string, tanggalKembali: string | null) => {
        if (status === "terlambat" || isOverdue(tanggalPinjam, tanggalKembali, status)) {
            return (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    <AlertTriangle size={14} /> Terlambat
                </span>
            );
        }

        switch (status) {
            case "pending":
            case "konfirmasi_peminjaman":
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        <Clock size={14} /> Menunggu
                    </span>
                );
            case "dipinjam":
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

    const fetchRiwayatPeminjaman = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("peminjaman")
                .select(`
                    id_peminjaman,
                    tanggal_pinjam,
                    jam_pinjam,
                    tanggal_kembali,
                    jam_kembali,
                    status,
                    pegawai:id_pegawai (nama, email),
                    detail_peminjaman (
                        id,
                        jumlah,
                        inventaris:id_inventaris (id_inventaris, nama, kode_inventaris)
                    )
                `)
                .in('status', ['pending', 'konfirmasi_peminjaman', 'dipinjam'])
                .order("tanggal_pinjam", { ascending: false });

            if (error) throw error;

            const formattedData: RiwayatPeminjaman[] = (data as any[]).map(item => ({
                id_peminjaman: item.id_peminjaman,
                tanggal_pinjam: item.tanggal_pinjam,
                jam_pinjam: item.jam_pinjam,
                tanggal_kembali: item.tanggal_kembali,
                jam_kembali: item.jam_kembali,
                status: item.status,
                pegawai: item.pegawai ? {
                    nama: item.pegawai.nama,
                    email: item.pegawai.email
                } : undefined,
                detail_peminjaman: (item.detail_peminjaman || []).map((d: any) => ({
                    id: d.id,
                    jumlah: d.jumlah,
                    inventaris: Array.isArray(d.inventaris) ? d.inventaris[0] : d.inventaris
                }))
            }));

            setRiwayatPeminjaman(formattedData);
        } catch (error) {
            console.error("Error fetching riwayat peminjaman:", error);
        }
    }, [supabase]);

    const handleApproveBorrow = async (id: string) => {
        if (!confirm('Setujui peminjaman ini?')) return;

        setProcessingId(id);
        try {
            const pinjaman = riwayatPeminjaman.find(p => p.id_peminjaman === id);
            if (!pinjaman) return;

            // 1. Check & Update each item's stock
            for (const detail of pinjaman.detail_peminjaman) {
                const { data: inv } = await supabase
                    .from('inventaris')
                    .select('jumlah')
                    .eq('id_inventaris', detail.inventaris.id_inventaris)
                    .single();

                if (!inv || inv.jumlah < detail.jumlah) {
                    throw new Error(`Stok barang tidak mencukupi`);
                }

                await supabase
                    .from('inventaris')
                    .update({ jumlah: inv.jumlah - detail.jumlah })
                    .eq('id_inventaris', detail.inventaris.id_inventaris);
            }

            // 2. Update status
            const { error } = await supabase
                .from('peminjaman')
                .update({ status: 'dipinjam' })
                .eq('id_peminjaman', id);

            if (error) throw error;

            alert('Peminjaman berhasil disetujui');
            fetchRiwayatPeminjaman();
        } catch (error: any) {
            console.error('Error approving borrow:', error);
            alert(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchRiwayatPeminjaman();
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [fetchRiwayatPeminjaman]);

    const jumlahAktif = riwayatPeminjaman.filter((item) => item.status === "dipinjam").length;
    const jumlahMenunggu = riwayatPeminjaman.filter((item) => ["pending", "konfirmasi_peminjaman"].includes(item.status)).length;
    const jumlahTerlambat = riwayatPeminjaman.filter((item) => item.status === "terlambat" || isOverdue(item.tanggal_pinjam, item.tanggal_kembali, item.status)).length;

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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Daftar Peminjaman</h1>
                            <p className="text-gray-500 mt-1">Pantau status peminjaman barang dan inventaris.</p>
                        </div>

                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari peminjaman..."
                                className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Package className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Peminjaman Aktif</p>
                                    <p className="text-2xl font-bold text-gray-800">{jumlahAktif}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                                    <Clock className="text-yellow-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Menunggu</p>
                                    <p className="text-2xl font-bold text-gray-800">{jumlahMenunggu}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Terlambat</p>
                                    <p className="text-2xl font-bold text-gray-800">{jumlahTerlambat}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                    <button
                        onClick={() => router.push("/admin/peminjaman/form")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                    >
                        <Plus size={18} className="text-white" />
                        Tekan Untuk Meminjam
                    </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden mt-8 max-w-full">
                        <div className="px-8 py-6 border-b">
                            <h2 className="text-2xl font-semibold text-gray-800">Daftar Peminjaman Aktif</h2>
                            <p className="text-sm text-gray-500 mt-1">Pantau pengajuan yang menunggu, peminjaman barang aktif, dan barang yang terlambat.</p>
                        </div>

                        {riwayatPeminjaman.length === 0 ? (
                            <div className="px-8 py-12 text-center text-gray-400">
                                <Package className="mx-auto mb-3" size={36} />
                                <p>Belum ada riwayat peminjaman</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-sm font-semibold text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Peminjam</th>
                                            <th className="px-6 py-4 text-left">Barang</th>
                                            <th className="px-6 py-4 text-center">Jumlah</th>
                                            <th className="px-6 py-4 text-left">Tanggal Pinjam</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {riwayatPeminjaman
                                            .filter(item =>
                                                item.pegawai?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                item.detail_peminjaman.some(d => d.inventaris?.nama?.toLowerCase().includes(searchTerm.toLowerCase()))
                                            )
                                            .map((item) => (
                                                <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-gray-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                                                                {item.pegawai?.nama?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{item.pegawai?.nama || "-"}</p>
                                                                <p className="text-xs text-gray-400">{item.pegawai?.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">
                                                        <div className="space-y-1">
                                                            {item.detail_peminjaman.map((detail) => (
                                                                <div key={detail.id} className="flex items-center gap-2">
                                                                    <Package size={14} className="text-gray-400" />
                                                                    <span className="text-sm font-medium">{detail.inventaris?.nama}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700 text-center">
                                                        <div className="space-y-1">
                                                            {item.detail_peminjaman.map((detail) => (
                                                                <div key={detail.id} className="text-sm font-semibold text-blue-600 bg-blue-50 rounded px-2 py-0.5 block">
                                                                    {detail.jumlah}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">
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
                                                            {isOverdue(item.tanggal_pinjam, item.tanggal_kembali, item.status) && (
                                                                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                                                    <AlertTriangle size={12} /> Terlambat
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(item.status, item.tanggal_pinjam, item.tanggal_kembali)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {["pending", "konfirmasi_peminjaman"].includes(item.status) && (
                                                            <button
                                                                onClick={() => handleApproveBorrow(item.id_peminjaman)}
                                                                disabled={!!processingId}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md shadow-blue-100 flex items-center gap-2 mx-auto"
                                                            >
                                                                {processingId === item.id_peminjaman ? <LoadingSpinner size="sm" /> : <CheckCircle2 size={16} />}
                                                                Setujui Pinjam
                                                            </button>
                                                        )}
                                                        {!["pending", "konfirmasi_peminjaman"].includes(item.status) && (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
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
