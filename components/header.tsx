'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
    const { profile, role, logout } = useAuth();

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'operator': return 'Operator';
            case 'pegawai': return 'Pegawai';
            default: return 'User';
        }
    };

    return (
        <header className="h-20 bg-white shadow-sm flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button onClick={onMenuClick} className="lg:hidden">
                        <Menu className="text-gray-600" />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-600 hidden md:inline-block">Manajemen Aset</span>
                    <span className="text-gray-300 hidden md:inline-block">|</span>
                    <span className="text-lg font-semibold text-gray-700">{title}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="font-medium text-gray-700">{profile?.nama || 'User'}</p>
                    <p className="text-sm text-gray-500">{getRoleLabel(role)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {profile?.nama?.charAt(0).toUpperCase() || <User size={20} />}
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}
