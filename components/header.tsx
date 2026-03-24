'use client';

import { LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
    const { profile, role, logout } = useAuth();

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case 'admin': return 'Administrator';
            case 'operator': return 'Operator';
            case 'pegawai': return 'Pegawai';
            default: return 'User';
        }
    };

    const getRoleColor = (role: string | null) => {
        switch (role) {
            case 'admin': return 'from-purple-500 to-purple-600';
            case 'operator': return 'from-blue-500 to-blue-600';
            case 'pegawai': return 'from-green-500 to-green-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    return (
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
                    <Bell size={18} />
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200" />

                {/* User Info */}
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-700">{profile?.nama || 'User'}</p>
                        <p className="text-xs text-gray-400">{getRoleLabel(role)}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getRoleColor(role)} flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
                        {profile?.nama?.charAt(0).toUpperCase() || <User size={16} />}
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
