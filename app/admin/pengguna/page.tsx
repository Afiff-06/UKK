"use client";

import { useState, useEffect, ReactNode } from "react";
import {
    Plus,
    Search,
    X,
    Pencil,
    Trash2,
    Users,
} from "lucide-react";
import { manageUserAction } from "./user-actions";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

interface UserData {
    id: string;
    nama: string;
    username: string;
    email: string;
    role: string;
    nip?: string;
    blocked_until: string | null;
}

export default function ManajemenPengguna() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<UserData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [showBanModal, setShowBanModal] = useState(false);
    const [userToBan, setUserToBan] = useState<UserData | null>(null);
    const [banUntil, setBanUntil] = useState("");

    const [formData, setFormData] = useState({
        nama: "",
        username: "",
        email: "",
        role: "pegawai",
        password: "",
        nip: "",
    });

    const supabase = createClient();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tb_user')
                .select('id, nama, username, email, role, nip, blocked_until')
                .order('role')
                .order('nama');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async () => {
        try {
            if (editUser) {
                // Update existing user via Server Action
                const result = await manageUserAction({
                    action: 'update',
                    userId: editUser.id,
                    userData: {
                        nama: formData.nama,
                        username: formData.username,
                        email: formData.email,
                        role: formData.role,
                        nip: formData.nip,
                        password: formData.password || undefined,
                    },
                });

                if (!result.success) throw new Error(result.error);
            } else {
                // Create new user via Server Action
                if (!formData.email) {
                    alert('Email wajib diisi untuk membuat pengguna baru');
                    return;
                }
                const result = await manageUserAction({
                    action: 'create',
                    userData: {
                        nama: formData.nama,
                        username: formData.username,
                        email: formData.email,
                        role: formData.role,
                        password: formData.password,
                        nip: formData.nip,
                    },
                });

                if (!result.success) throw new Error(result.error);
            }

            setShowModal(false);
            setEditUser(null);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error('Error saving user:', error);
            alert(error.message || 'Gagal menyimpan pengguna.');
        }
    };

    const handleDelete = async (user: UserData) => {
        if (!confirm(`Hapus pengguna "${user.nama}"?`)) return;

        try {
            const result = await manageUserAction({
                action: 'delete',
                userId: user.id,
            });
            if (!result.success) throw new Error(result.error);
            fetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert(error.message || 'Gagal menghapus pengguna.');
        }
    };

    const handleToggleBlock = async (user: UserData) => {
        const isCurrentlyBlocked = user.blocked_until && new Date(user.blocked_until) > new Date();

        if (isCurrentlyBlocked) {
            if (!confirm(`Buka blokir pengguna "${user.nama}"?`)) return;
            try {
                const { error } = await supabase
                    .from('tb_user')
                    .update({ blocked_until: null })
                    .eq('id', user.id);
                if (error) throw error;
                fetchUsers();
            } catch (error: any) {
                console.error('Error unblocking user:', error);
                alert(error.message || 'Gagal membuka blokir.');
            }
        } else {
            setUserToBan(user);
            setBanUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default 7 days
            setShowBanModal(true);
        }
    };

    const confirmBan = async () => {
        if (!userToBan || !banUntil) return;

        try {
            const { error } = await supabase
                .from('tb_user')
                .update({
                    blocked_until: new Date(banUntil).toISOString()
                })
                .eq('id', userToBan.id);

            if (error) throw error;
            setShowBanModal(false);
            setUserToBan(null);
            fetchUsers();
        } catch (error: any) {
            console.error('Error banning user:', error);
            alert(error.message || 'Gagal memblokir pengguna.');
        }
    };

    const handleEdit = (user: UserData) => {
        setEditUser(user);
        setFormData({
            nama: user.nama,
            username: user.username,
            email: user.email || "",
            role: user.role,
            password: "",
            nip: user.nip || "",
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            nama: "",
            username: "",
            email: "",
            role: "pegawai",
            password: "",
            nip: "",
        });
    };

    const openAddModal = () => {
        setEditUser(null);
        resetForm();
        setShowModal(true);
    };

    const filteredUsers = users.filter(user => {
        const matchSearch =
            user.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchRole = !filterRole || user.role === filterRole;
        return matchSearch && matchRole;
    });

    const getRoleBadge = (role: string, blockedUntil: string | null) => {
        const isBlocked = blockedUntil && new Date(blockedUntil) > new Date();
        if (isBlocked) {
            return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Terblokir</span>;
        }

        switch (role) {
            case 'admin':
                return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Admin</span>;
            case 'operator':
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Operator</span>;
            case 'pegawai':
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Pegawai</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{role}</span>;
        }
    };

    return (

        <div className="min-h-screen bg-[#f5f7fb] w-full">
            <main className="flex-1 flex flex-col">
                <Header title="Manajemen Pengguna" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Manajemen Pengguna</h1>
                    <p className="text-gray-500 mb-6">Kelola data pengguna sistem</p>

                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex gap-3">
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="border rounded-xl px-4 py-2 bg-white"
                            >
                                <option value="">Semua Peran</option>
                                <option value="admin">Admin</option>
                                <option value="operator">Operator</option>
                                <option value="pegawai">Pegawai</option>
                            </select>
                        </div>

                        <div className="flex gap-3 items-center">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    className="border rounded-xl pl-10 pr-4 py-2 bg-white"
                                    placeholder="Cari pengguna..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={openAddModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow transition-colors"
                            >
                                <Plus size={18} />
                                Tambah Pengguna
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                        {loading ? (
                            <div className="p-12">
                                <LoadingSpinner />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="mx-auto text-gray-300 mb-4" size={48} />
                                <p className="text-gray-500">Tidak ada data pengguna</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Nama</th>
                                        <th className="px-6 py-4 text-left">Username</th>
                                        <th className="px-6 py-4 text-left">Email</th>
                                        <th className="px-6 py-4 text-left">Peran</th>
                                        <th className="px-6 py-4 text-left">Aksi</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                                                        {user.nama.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{user.nama}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{user.username}</td>
                                            <td className="px-6 py-4 text-gray-600">{user.email || '-'}</td>
                                            <td className="px-6 py-4">{getRoleBadge(user.role, user.blocked_until)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleToggleBlock(user)}
                                                        className={`border px-3 py-2 rounded-lg flex items-center gap-1 transition-colors ${user.blocked_until && new Date(user.blocked_until) > new Date()
                                                                ? 'text-green-600 hover:bg-green-50 border-green-200'
                                                                : 'text-red-500 hover:bg-red-50 border-red-200'
                                                            }`}
                                                        title={user.blocked_until && new Date(user.blocked_until) > new Date() ? "Buka Blokir" : "Blokir Akun"}
                                                    >
                                                        {user.blocked_until && new Date(user.blocked_until) > new Date() ? "Unban" : "Ban"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="border px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {!loading && filteredUsers.length > 0 && (
                            <div className="flex justify-between items-center p-6 text-sm text-gray-500 border-t">
                                <span>Menampilkan {filteredUsers.length} dari {users.length} pengguna</span>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
                        <button
                            onClick={() => {
                                setShowModal(false);
                                setEditUser(null);
                                resetForm();
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X />
                        </button>

                        <h2 className="text-2xl font-semibold mb-6">
                            {editUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Nama</label>
                                <input
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder="Nama lengkap"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Username</label>
                                <input
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">
                                    Email {editUser && <span className="text-xs text-gray-400 italic">(Tidak dapat diubah)</span>}
                                </label>
                                <input
                                    type="email"
                                    className={`w-full border rounded-xl px-4 py-3 transition-colors ${editUser ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : ''}`}
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    disabled={!!editUser}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Peran</label>
                                <select
                                    className="w-full border rounded-xl px-4 py-3"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="admin">Admin</option>
                                    <option value="operator">Operator</option>
                                    <option value="pegawai">Pegawai</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">
                                    Password {editUser ? '(kosongkan jika tidak diubah)' : ''}
                                </label>
                                <input
                                    type="password"
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder={editUser ? "Kosongkan jika tidak diubah" : "Password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">NIP</label>
                                <input
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder="NIP (opsional)"
                                    value={formData.nip}
                                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditUser(null);
                                    resetForm();
                                }}
                                className="px-5 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.nama || !formData.username || !formData.email || (!editUser && !formData.password)}
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {editUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && userToBan && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-[60] backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>

                        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
                            <span className="text-red-500">🚫</span> Blokir Akun
                        </h2>
                        <p className="text-gray-500 mb-6 text-sm">
                            Tentukan sampai kapan akun <strong>{userToBan.nama}</strong> akan ditangguhkan.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Blokir Sampai Tanggal</label>
                                <input
                                    type="date"
                                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:border-red-500 outline-none transition-all"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={banUntil}
                                    onChange={(e) => setBanUntil(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setBanUntil(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                                    className="text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-gray-600 transition-colors"
                                >
                                    1 Hari
                                </button>
                                <button
                                    onClick={() => setBanUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                                    className="text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-gray-600 transition-colors"
                                >
                                    1 Minggu
                                </button>
                                <button
                                    onClick={() => setBanUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                                    className="text-xs bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-gray-600 transition-colors"
                                >
                                    1 Bulan
                                </button>
                                <button
                                    onClick={() => setBanUntil('2099-12-31')}
                                    className="text-xs bg-red-50 hover:bg-red-100 py-2 rounded-xl text-red-600 font-medium transition-colors"
                                >
                                    Permanen
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowBanModal(false);
                                    setUserToBan(null);
                                }}
                                className="flex-1 py-3 border-2 border-gray-100 rounded-2xl font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmBan}
                                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                            >
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
