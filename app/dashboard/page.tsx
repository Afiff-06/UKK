"use client";

import { useState, useEffect, ReactNode } from "react";
import SidebarUtama from "@/components/sidebar-utama";
import Header from "@/components/header";
import {
    User,
    Package,
    ClipboardList,
    AlertCircle,
    TrendingUp,
    Clock,
    CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { useRouter } from "next/navigation";

interface DashboardStats {
    totalPengguna: number;
    totalBarang: number;
    totalDipinjam: number;
    totalTerlambat: number;
    recentPeminjaman: any[];
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalPengguna: 0,
        totalBarang: 0,
        totalDipinjam: 0,
        totalTerlambat: 0,
        recentPeminjaman: [],
    });
    const [loading, setLoading] = useState(false);
    const { role, profile } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch total users count from tb_user
                const { count: totalUsersCount } = await supabase
                    .from('tb_user')
                    .select('*', { count: 'exact', head: true });

                // Fetch inventaris count
                const { count: inventarisCount } = await supabase
                    .from('inventaris')
                    .select('*', { count: 'exact', head: true });

                // Fetch peminjaman stats
                let peminjamanQuery = supabase
                    .from('peminjaman')
                    .select(`
                        *,
                        pegawai:id_pegawai (nama, email),
                        detail_peminjaman (
                            jumlah,
                            inventaris:id_inventaris (nama)
                        )
                    `)
                    .order('created_at', { ascending: false });

                // If pegawai, only fetch their own
                if (role === 'pegawai' && profile?.id) {
                    peminjamanQuery = peminjamanQuery.eq('id_pegawai', profile.id);
                }

                const { data: peminjaman } = await peminjamanQuery;

                const dipinjam = peminjaman?.filter(p => p.status === 'disetujui' || p.status === 'pending') || [];
                const terlambat = dipinjam.filter(p => {
                    const borrowed = new Date(p.tanggal_pinjam);
                    const today = new Date();
                    return (today.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24) > 7;
                });

                setStats({
                    totalPengguna: totalUsersCount || 0,
                    totalBarang: inventarisCount || 0,
                    totalDipinjam: dipinjam.length,
                    totalTerlambat: terlambat.length,
                    recentPeminjaman: peminjaman?.slice(0, 5) || [],
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [role, profile]);

    const getWelcomeMessage = () => {
        switch (role) {
            case 'admin':
                return 'Berikut adalah ringkasan informasi aset terkini yang bisa Anda kelola.';
            case 'operator':
                return 'Kelola inventaris dan proses peminjaman dengan mudah.';
            case 'pegawai':
                return 'Lihat status peminjaman dan ajukan pengembalian barang.';
            default:
                return 'Selamat datang di sistem manajemen aset.';
        }
    };

    const getStatCards = () => {
        if (role === 'pegawai') {
            return [
                { icon: <ClipboardList />, title: "Peminjaman Aktif", value: stats.totalDipinjam.toString(), color: "blue" as const },
                { icon: <Clock />, title: "Menunggu Konfirmasi", value: stats.recentPeminjaman.filter(p => p.status === 'pending').length.toString(), color: "orange" as const },
                { icon: <CheckCircle />, title: "Telah Dikembalikan", value: stats.recentPeminjaman.filter(p => p.status === 'dikembalikan').length.toString(), color: "green" as const },
                { icon: <AlertCircle />, title: "Terlambat", value: stats.totalTerlambat.toString(), color: "red" as const },
            ];
        }

        if (role === 'operator') {
            return [
                { icon: <Package />, title: "Total Inventaris", value: stats.totalBarang.toString(), color: "blue" as const },
                { icon: <ClipboardList />, title: "Sedang Dipinjam", value: stats.totalDipinjam.toString(), color: "orange" as const },
                { icon: <TrendingUp />, title: "Peminjaman Hari Ini", value: stats.recentPeminjaman.filter(p => p.tanggal_pinjam === new Date().toISOString().split('T')[0]).length.toString(), color: "green" as const },
                { icon: <AlertCircle />, title: "Terlambat", value: stats.totalTerlambat.toString(), color: "red" as const },
            ];
        }

        // Admin
        return [
            { icon: <User />, title: "Total Pengguna", value: stats.totalPengguna.toString(), color: "blue" as const },
            { icon: <Package />, title: "Total Barang", value: stats.totalBarang.toString(), color: "orange" as const },
            { icon: <ClipboardList />, title: "Barang Dipinjam", value: stats.totalDipinjam.toString(), color: "green" as const },
            { icon: <AlertCircle />, title: "Terlambat", value: stats.totalTerlambat.toString(), color: "red" as const },
        ];
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'disetujui':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Dipinjam</span>;
            case 'pending':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Pending</span>;
            case 'dikembalikan':
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Dikembalikan</span>;
            case 'ditolak':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Ditolak</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
        }
    };

    return (
        <SidebarUtama>
            <div className="min-h-screen bg-[#f5f7fb] w-full">
                <main className="flex-1 flex flex-col">
                    <Header title="Dashboard" />

                    <div className="p-8">
                        {/* WELCOME */}
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">
                            Selamat Datang, {profile?.nama || 'User'}!
                        </h1>
                        <p className="text-gray-500 mb-8 max-w-3xl">
                            {getWelcomeMessage()}
                        </p>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : (
                            <>
                                {/* STATS */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                                    {getStatCards().map((card, index) => (
                                        <StatCard
                                            key={index}
                                            icon={card.icon}
                                            title={card.title}
                                            value={card.value}
                                            color={card.color}
                                        />
                                    ))}
                                </div>

                                {/* RECENT ACTIVITY */}
                                <div className="bg-white rounded-3xl shadow-lg p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-semibold text-gray-800">
                                            {role === 'pegawai' ? 'Peminjaman Saya' : 'Aktivitas Terbaru'}
                                        </h2>
                                        <button
                                            onClick={() => router.push('/peminjaman')}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            Lihat Semua →
                                        </button>
                                    </div>

                                    {stats.recentPeminjaman.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ClipboardList className="mx-auto text-gray-300 mb-4" size={48} />
                                            <p className="text-gray-500">Belum ada aktivitas peminjaman</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-hidden rounded-2xl border">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                                    <tr>
                                                        {role !== 'pegawai' && <th className="px-6 py-4 text-left">Peminjam</th>}
                                                        <th className="px-6 py-4 text-left">Barang</th>
                                                        <th className="px-6 py-4 text-left">Tanggal</th>
                                                        <th className="px-6 py-4 text-left">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {stats.recentPeminjaman.map((item) => (
                                                        <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                            {role !== 'pegawai' && (
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                                            {item.pegawai?.nama?.charAt(0) || '?'}
                                                                        </div>
                                                                        <span className="font-medium text-gray-800">
                                                                            {item.pegawai?.nama || 'Unknown'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4 text-gray-700">
                                                                {item.detail_peminjaman?.map((d: any) => d.inventaris?.nama).join(', ') || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-700">
                                                                {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {getStatusBadge(item.status)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </SidebarUtama>
    );
}

/* ================== COMPONENTS ================== */

function StatCard({
    icon,
    title,
    value,
    color,
}: {
    icon: ReactNode;
    title: string;
    value: string;
    color: "blue" | "orange" | "green" | "red";
}) {
    const colorMap = {
        blue: "from-blue-500 to-blue-600",
        orange: "from-orange-400 to-orange-500",
        green: "from-green-500 to-green-600",
        red: "from-red-500 to-red-600",
    };

    return (
        <div
            className={`relative bg-gradient-to-r ${colorMap[color]} text-white rounded-2xl p-6 shadow-lg overflow-hidden`}
        >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-6 -mb-6" />

            <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-white/20 p-3 rounded-xl">{icon}</div>
                    <p className="font-medium opacity-90">{title}</p>
                </div>

                <h3 className="text-4xl font-bold">{value}</h3>
            </div>
        </div>
    );
}