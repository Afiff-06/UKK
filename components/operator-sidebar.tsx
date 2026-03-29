'use client'

import { useRouter } from "next/navigation";
import SidebarItem from "./sidebar-item";
import {
    LayoutDashboard,
    Package,
    BookOpen,
    RotateCcw,
    Box,
    HomeIcon
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FullPageLoader } from "./loading-spinner";

const operatorMenu = [
    { icon: <LayoutDashboard size={20} />, label: "Beranda", path: "/operator/dashboard" },
    { icon: <Package size={20} />, label: "Inventaris Barang", path: "/operator/inventaris" },
    { icon: <Box size={20} />, label: "Jenis Barang", path: "/operator/jenis-barang" },
    { icon: <HomeIcon size={20} />, label: "Ruang Barang", path: "/operator/ruang-barang" },
    { icon: <BookOpen size={20} />, label: "Peminjaman", path: "/operator/peminjaman" },
    { icon: <RotateCcw size={20} />, label: "Pengembalian", path: "/operator/pengembalian" },
];

export default function OperatorSidebar({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();

    if (loading && !user) {
        return <FullPageLoader />;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#f5f7fb] flex w-full">
            <aside className="w-72 bg-white shadow-lg flex flex-col sticky top-0 h-screen overflow-y-auto">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Package className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-gray-800">Manajemen Aset</h1>
                            <p className="text-xs text-gray-500">Operator</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {operatorMenu.map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.path || (item.path !== '/operator/dashboard' && pathname.startsWith(item.path))}
                            onClick={() => router.push(item.path)}
                        />
                    ))}
                </nav>
            </aside>
            <div className="flex-1 flex flex-col min-w-0">
                {children}
            </div>
        </div>
    )
}
