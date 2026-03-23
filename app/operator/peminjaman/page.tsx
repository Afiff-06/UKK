"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import {
    Package,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Search,
} from "lucide-react";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";

// Form-related interfaces removed

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
    pegawai?: { nama: string; email: string } | null;
    detail_peminjaman?: {
        id: string;
        jumlah: number;
        inventaris?: { nama: string; kode_inventaris: number } | null;
    }[] | null;
}

export default function Peminjaman() {
    const [riwayatPeminjaman, setRiwayatPeminjaman] = useState<RiwayatPeminjaman[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

    const fetchRiwayatPeminjaman = useCallback(async () => {
        try {
            const { data, error } = await supabase
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

            if (error) throw error;

            console.log(data)

            const riwayat = ((data || []) as any[]).map((item) => ({
                id_peminjaman: item.id_peminjaman,
                tanggal_pinjam: item.tanggal_pinjam,
                tanggal_kembali: item.tanggal_kembali,
                status: item.status,
                pegawai: Array.isArray(item.pegawai) ? item.pegawai[0] : item.pegawai,
                detail_peminjaman: (item.detail_peminjaman || []).map((detail: any) => ({
                    id: detail.id,
                    jumlah: detail.jumlah,
                    inventaris: Array.isArray(detail.inventaris) ? detail.inventaris[0] : detail.inventaris,
                })),
            }));

            setRiwayatPeminjaman(riwayat);
        } catch (error) {
            console.error("Error fetching riwayat peminjaman:", error);
        }
    }, [supabase]);

    // Form-related logic and effects removed

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

    // Form helper functions removed

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

                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden mt-8 max-w-4xl">
                        <div className="px-8 py-6 border-b">
                            <h2 className="text-2xl font-semibold text-gray-800">Riwayat Peminjaman</h2>
                            <p className="text-sm text-gray-500 mt-1">Pantau pengajuan yang menunggu, peminjaman aktif, dan barang yang sudah melewati batas waktu.</p>
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
                                                        {new Date(item.tanggal_pinjam).toLocaleDateString("id-ID", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
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

// Removed Section component as part of form feature removal
