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
    Package,
    ClipboardList
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth-context";
import { FullPageLoader } from "./loading-spinner";

interface MenuItem {
    icon: React.ReactElement;
    label: string;
    path: string;
}

const menuConfig: Record<string, MenuItem[]> = {
    admin: [
        { icon: <LayoutDashboard />, label: "Beranda", path: "/admin/dashboard" },
        { icon: <Users />, label: "Manajemen Pengguna", path: "/admin/pengguna" },
        { icon: <BookOpen />, label: "Peminjaman", path: "/admin/peminjaman" },
        { icon: <RotateCcw />, label: "Pengembalian", path: "/admin/pengembalian" },
        { icon: <FileText />, label: "Laporan", path: "/laporan" },
    ],
    operator: [
        { icon: <LayoutDashboard />, label: "Beranda", path: "/operator/dashboard" },
        { icon: <Package />, label: "Inventaris Barang", path: "/inventaris" },
        { icon: <BookOpen />, label: "Peminjaman", path: "/peminjaman" },
        { icon: <RotateCcw />, label: "Pengembalian", path: "/pengembalian" },
    ],
    pegawai: [
        { icon: <LayoutDashboard />, label: "Beranda", path: "/dashboard" },
        { icon: <ClipboardList />, label: "Peminjaman", path: "/peminjaman" },
        { icon: <RotateCcw />, label: "Pengembalian", path: "/pengembalian" },
    ],
};

export default function SidebarUtama({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { role, logout, loading } = useAuth();

    if (loading) {
        return <FullPageLoader />;
    }

    // Get menu items based on role, default to pegawai if role not found
    const menuItems = menuConfig[role || 'pegawai'] || menuConfig.pegawai;

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'Administrator';
            case 'operator': return 'Operator';
            case 'pegawai': return 'Pegawai';
            default: return 'User';
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f7fb] flex w-full">
            {/* SIDEBAR */}
            <aside className="w-72 bg-white shadow-lg flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Package className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-gray-800">Manajemen Aset</h1>
                            <p className="text-xs text-gray-500">{getRoleLabel(role)}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.path}
                            onClick={() => router.push(item.path)}
                        />
                    ))}
                </nav>

                {/* <div className="p-4 border-t">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div> */}
            </aside>
            {children}
        </div>
    )
}