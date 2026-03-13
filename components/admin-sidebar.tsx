'use client'

import { useRouter } from "next/navigation";
import SidebarItem from "./sidebar-item";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    RotateCcw,
    FileText,
    LogOut,
    Package
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FullPageLoader } from "./loading-spinner";

const adminMenu = [
    { icon: <LayoutDashboard />, label: "Beranda", path: "/admin/dashboard" },
    { icon: <Users />, label: "Manajemen Pengguna", path: "/admin/pengguna" },
    { icon: <BookOpen />, label: "Peminjaman", path: "/admin/peminjaman" },
    { icon: <RotateCcw />, label: "Pengembalian", path: "/admin/pengembalian" },
    { icon: <FileText />, label: "Laporan", path: "/admin/laporan" },
];

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, loading } = useAuth();

    if (loading) {
        return <FullPageLoader />;
    }

    return (
        <div className="min-h-screen bg-[#f5f7fb] flex w-full">
            <aside className="w-72 bg-white shadow-lg flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Package className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-gray-800">Inventaris</h1>
                            <p className="text-xs text-gray-500">Admin</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {adminMenu.map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.path}
                            onClick={() => router.push(item.path)}
                        />
                    ))}
                </nav>
            </aside>
            {children}
        </div>
    )
}
