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
import SidebarUtama from "@/components/sidebar-utama";
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
}

interface PetugasData {
    id_petugas: string;
    nama_petugas: string;
    username: string;
    level_id: number;
    level?: { nama_level: string };
}

type CombinedUser = {
    id: string;
    nama: string;
    username: string;
    email?: string;
    role: string;
    type: 'user' | 'petugas';
};

export default function ManajemenPengguna() {
    const [users, setUsers] = useState<CombinedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<CombinedUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("");

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
            // Fetch pegawai/users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*');

            // Fetch petugas (admin/operator)
            const { data: petugasData, error: petugasError } = await supabase
                .from('petugas')
                .select(`
                    *,
                    level:level_id (nama_level)
                `);

            const combined: CombinedUser[] = [];

            if (usersData) {
                usersData.forEach(user => {
                    combined.push({
                        id: user.id,
                        nama: user.nama,
                        username: user.username,
                        email: user.email,
                        role: user.role || 'pegawai',
                        type: 'user',
                    });
                });
            }

            if (petugasData) {
                petugasData.forEach(petugas => {
                    combined.push({
                        id: petugas.id_petugas,
                        nama: petugas.nama_petugas,
                        username: petugas.username,
                        role: (petugas.level as any)?.nama_level || 'admin',
                        type: 'petugas',
                    });
                });
            }

            setUsers(combined);
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
                // Update existing user
                if (editUser.type === 'petugas') {
                    const levelMap: Record<string, number> = { admin: 1, operator: 2, pegawai: 3 };
                    const { error } = await supabase
                        .from('petugas')
                        .update({
                            nama_petugas: formData.nama,
                            username: formData.username,
                            level_id: levelMap[formData.role] || 1,
                        })
                        .eq('id_petugas', editUser.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('users')
                        .update({
                            nama: formData.nama,
                            username: formData.username,
                            email: formData.email,
                            role: formData.role,
                            nip: formData.nip,
                        })
                        .eq('id', editUser.id);
                    if (error) throw error;
                }
            } else {
                // Create new user
                if (formData.role === 'admin' || formData.role === 'operator') {
                    // Create petugas
                    const levelMap: Record<string, number> = { admin: 1, operator: 2 };
                    const { error } = await supabase
                        .from('petugas')
                        .insert({
                            nama_petugas: formData.nama,
                            username: formData.username,
                            password: formData.password, // Note: In production, hash this
                            level_id: levelMap[formData.role],
                        });
                    if (error) throw error;
                } else {
                    // Create user in auth first, then in users table
                    // For demo purposes, just create in users table
                    const { error } = await supabase
                        .from('users')
                        .insert({
                            nama: formData.nama,
                            username: formData.username,
                            email: formData.email,
                            role: formData.role,
                            nip: formData.nip,
                        });
                    if (error) throw error;
                }
            }

            setShowModal(false);
            setEditUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Gagal menyimpan pengguna. Pastikan username/email belum digunakan.');
        }
    };

    const handleDelete = async (user: CombinedUser) => {
        if (!confirm(`Hapus pengguna "${user.nama}"?`)) return;

        try {
            if (user.type === 'petugas') {
                const { error } = await supabase
                    .from('petugas')
                    .delete()
                    .eq('id_petugas', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', user.id);
                if (error) throw error;
            }
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleEdit = (user: CombinedUser) => {
        setEditUser(user);
        setFormData({
            nama: user.nama,
            username: user.username,
            email: user.email || "",
            role: user.role,
            password: "",
            nip: "",
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

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Admin</span>;
            case 'operator':
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Operator</span>;
            case 'pegawai':
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Pegawai</span>;
            case 'petugas':
                return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Petugas</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{role}</span>;
        }
    };

    return (
        <SidebarUtama>
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
                                            <tr key={`${user.type}-${user.id}`} className="hover:bg-gray-50">
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
                                                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
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

                                {(formData.role === 'pegawai' || formData.role === 'petugas') && (
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="email@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Peran</label>
                                    <select
                                        className="w-full border rounded-xl px-4 py-3"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        disabled={!!editUser}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="operator">Operator</option>
                                        <option value="pegawai">Pegawai</option>
                                    </select>
                                </div>

                                {!editUser && (formData.role === 'admin' || formData.role === 'operator') && (
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Password</label>
                                        <input
                                            type="password"
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="Password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                )}
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
                                    disabled={!formData.nama || !formData.username}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {editUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SidebarUtama>
    );
}
