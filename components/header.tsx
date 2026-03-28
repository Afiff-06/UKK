'use client';

import { useState, useEffect, useRef } from 'react';
import { LogOut, User, Bell, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { isPastDueDate, getDueDate } from '@/lib/peminjaman-status';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

interface Notification {
    id_peminjaman: string;
    nama_pegawai: string;
    nama_barang: string;
    tanggal_kembali: string;
    tanggal_pinjam: string;
    isActive: boolean;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
    const { profile, role, logout } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

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

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!profile?.id) return;
            
            try {
                let query = supabase
                    .from('peminjaman')
                    .select(`
                        id_peminjaman,
                        tanggal_pinjam,
                        tanggal_kembali,
                        status,
                        pegawai:id_pegawai (nama),
                        detail_peminjaman (
                            inventaris:id_inventaris (nama)
                        )
                    `)
                    .in('status', ['dipinjam', 'pending', 'terlambat'])
                    .order('tanggal_pinjam', { ascending: false });
                
                if (role === 'pegawai') {
                    query = query.eq('id_pegawai', profile.id);
                }

                const { data, error } = await query;
                
                if (error) throw error;
                
                if (data) {
                    const allNotifs: Notification[] = [];

                    data.forEach((p: any) => {
                        const isLateNow = ['dipinjam', 'pending'].includes(p.status) && isPastDueDate(p.tanggal_pinjam, p.tanggal_kembali);
                        const wasReturnedLate = p.status === 'terlambat';

                        if (isLateNow || wasReturnedLate) {
                            allNotifs.push({
                                id_peminjaman: p.id_peminjaman,
                                nama_pegawai: p.pegawai?.nama || 'Unknown',
                                nama_barang: p.detail_peminjaman?.map((d: any) => d.inventaris?.nama).join(', ') || 'Barang',
                                tanggal_kembali: p.tanggal_kembali || '',
                                tanggal_pinjam: p.tanggal_pinjam || '',
                                isActive: isLateNow
                            });
                        }
                    });
                        
                    setNotifications(allNotifs);
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };

        fetchNotifications();
    }, [profile?.id, role, supabase]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = () => {
        setShowNotifications(!showNotifications);
    };

    const navigateToDetail = (id: string) => {
        setShowNotifications(false);
        if (role === 'admin') router.push(`/admin/peminjaman`);
        else if (role === 'operator') router.push(`/operator/peminjaman`);
        else router.push(`/pegawai/peminjaman`);
    };

    const activeCount = notifications.filter(n => n.isActive).length;

    return (
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={handleNotificationClick}
                        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                        <Bell size={18} />
                        {activeCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all z-50">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h3 className="font-semibold text-gray-800">Notifikasi</h3>
                                {activeCount > 0 && (
                                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                        {activeCount} Baru
                                    </span>
                                )}
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center flex flex-col items-center">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                            <Bell className="text-gray-400" size={20} />
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">Tidak ada notifikasi</p>
                                        <p className="text-xs text-gray-400 mt-1">Anda sudah melihat semuanya.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {notifications.map((notif, index) => {
                                            const dueDate = getDueDate(notif.tanggal_pinjam, notif.tanggal_kembali);
                                            return (
                                                <div 
                                                    key={`${notif.id_peminjaman}-${index}`}
                                                    onClick={() => navigateToDetail(notif.id_peminjaman)}
                                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 relative overflow-hidden group ${notif.isActive ? '' : 'bg-gray-50/50'}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="flex-shrink-0 mt-1">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${notif.isActive ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                                {notif.isActive ? <AlertCircle size={16} strokeWidth={2.5} /> : <Clock size={16} strokeWidth={2.5} />}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium mb-0.5 ${notif.isActive ? 'text-gray-800' : 'text-gray-600'}`}>
                                                                {notif.isActive ? 'Peringatan Terlambat' : 'Riwayat Terlambat'}
                                                            </p>
                                                            <p className={`text-sm leading-snug mb-2 ${notif.isActive ? 'text-gray-600' : 'text-gray-500'}`}>
                                                                {role === 'pegawai' 
                                                                    ? (notif.isActive ? `Anda belum mengembalikan ${notif.nama_barang}` : `Anda pernah terlambat mengembalikan ${notif.nama_barang}`)
                                                                    : (notif.isActive ? `${notif.nama_pegawai} telat mengembalikan ${notif.nama_barang}` : `${notif.nama_pegawai} telah tercatat terlambat mengembalikan ${notif.nama_barang}`)
                                                                }
                                                            </p>
                                                            <div className={`flex items-center gap-1.5 text-xs font-medium inline-flex px-2 py-1 rounded-md ${notif.isActive ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                                                                <Clock size={12} />
                                                                Jatuh tempo: {dueDate.toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
