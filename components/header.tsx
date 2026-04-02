'use client';

import { useState, useEffect, useRef } from 'react';
import { Power, User, Bell, AlertCircle, Clock, ChevronDown, Mail, Phone, MapPin, Hash, IdCard, GraduationCap, School, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { isPastDueDate, getDueDate } from '@/lib/peminjaman-status';
import { useRouter } from 'next/navigation';
import { getRoleLabel, getRoutePrefixForRole, isBorrowerRole } from '@/lib/roles';

interface HeaderProps {
    title: string;
}

interface NotificationBorrowerRow {
    nama?: string | null;
}

interface NotificationDetailRow {
    inventaris?: {
        nama?: string | null;
    }[] | {
        nama?: string | null;
    } | null;
}

interface NotificationRow {
    id_peminjaman: string;
    tanggal_pinjam: string;
    tanggal_kembali: string | null;
    status: string;
    pegawai?: NotificationBorrowerRow[] | NotificationBorrowerRow | null;
    detail_peminjaman?: NotificationDetailRow[] | null;
}

interface Notification {
    id_peminjaman: string;
    nama_pegawai: string;
    nama_barang: string;
    tanggal_kembali: string;
    tanggal_pinjam: string;
    isActive: boolean;
}

export default function Header({ title }: HeaderProps) {
    const { profile, role, logout } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const getRoleColor = (role: string | null) => {
        return 'from-blue-600 to-blue-700';
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!profile?.id || !isBorrowerRole(role)) {
                setNotifications([]);
                return;
            }
            
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
                
                if (isBorrowerRole(role)) {
                    query = query.eq('id_pegawai', profile.id);
                }

                const { data, error } = await query;
                
                if (error) throw error;
                
                if (data) {
                    const allNotifs: Notification[] = [];

                    (data as NotificationRow[]).forEach((p) => {
                        const isLateNow = ['dipinjam', 'pending'].includes(p.status) && isPastDueDate(p.tanggal_pinjam, p.tanggal_kembali);
                        const wasReturnedLate = p.status === 'terlambat';
                        const borrower = Array.isArray(p.pegawai) ? p.pegawai[0] : p.pegawai;

                        if (isLateNow || wasReturnedLate) {
                            allNotifs.push({
                                id_peminjaman: p.id_peminjaman,
                                nama_pegawai: borrower?.nama || 'Tidak Diketahui',
                                nama_barang: p.detail_peminjaman?.map((detail) => {
                                    const inventaris = Array.isArray(detail.inventaris)
                                        ? detail.inventaris[0]
                                        : detail.inventaris;
                                    return inventaris?.nama || 'Barang';
                                }).join(', ') || 'Barang',
                                tanggal_kembali: p.tanggal_kembali || '',
                                tanggal_pinjam: p.tanggal_pinjam || '',
                                isActive: isLateNow
                            });
                        }
                    });
                        
                    setNotifications(allNotifs);
                }
            } catch (error) {
                console.error("Gagal memuat notifikasi:", error);
            }
        };

        fetchNotifications();
    }, [profile?.id, role, supabase]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowProfile(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = () => {
        setShowNotifications(!showNotifications);
    };

    const navigateToDetail = () => {
        setShowNotifications(false);
        router.push(`${getRoutePrefixForRole(role)}/peminjaman`);
    };

    const activeCount = notifications.filter(n => n.isActive).length;

    return (
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            </div>

            <div className="flex items-center gap-3">
                {isBorrowerRole(role) && (
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
                                                        onClick={navigateToDetail}
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
                                                                    {isBorrowerRole(role) 
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
                )}

                {/* User Info & Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <div 
                        onClick={() => setShowProfile(!showProfile)}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-2xl transition-colors group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{profile?.nama || 'Pengguna'}</p>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{getRoleLabel(role)}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleColor(role)} flex items-center justify-center text-white text-base font-bold shadow-sm group-hover:shadow-md transition-all`}>
                            {profile?.nama?.charAt(0).toUpperCase() || <User size={20} />}
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
                    </div>

                    {showProfile && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button 
                                onClick={logout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Power size={16} />
                                <span className="font-medium">Keluar</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>


        </header>
    );
}
