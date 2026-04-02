"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Eye,
    EyeOff,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
    X,
    Ban,
    ShieldAlert,
    ShieldCheck
} from "lucide-react";

import Header from "@/components/header";
import LoadingSpinner from "@/components/loading-spinner";
import { getRoleLabel } from "@/lib/roles";
import { canDeleteManagedUser, getEditableRoleOptions } from "@/lib/user-validation";
import { normalizeDigitsOnly } from "@/lib/user-normalization";
import { showConfirmDanger, showError, showSuccess, showWarning, showBanDialog } from "@/lib/swal";
import { getManagedUsersAction, manageUserAction } from "./user-actions";

interface UserData {
    id: string;
    nama: string;
    username: string;
    role: "admin" | "operator" | "pegawai" | "guru" | "siswa";
    nip: string | null;
    alamat: string | null;
    blocked_until: string | null;
    no_telp: string | null;
    nisn: string | null;
    kelas: string | null;
    konsentrasi_keahlian: string | null;
}

interface FormState {
    nama: string;
    username: string;
    role: "operator" | "pegawai" | "guru" | "siswa" | "admin";
    password: string;
    nip: string;
    alamat: string;
    no_telp: string;
    nisn: string;
    kelas: string;
    konsentrasi_keahlian: string;
}

const EMPTY_FORM: FormState = {
    nama: "",
    username: "",
    role: "pegawai",
    password: "",
    nip: "",
    alamat: "",
    no_telp: "",
    nisn: "",
    kelas: "",
    konsentrasi_keahlian: "",
};

export default function ManajemenPengguna() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<UserData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const result = await getManagedUsersAction();
            if (!result.success) throw new Error(result.error);
            setUsers((result.users || []) as UserData[]);
        } catch (error) {
            console.error("Error fetching users:", error);
            await showError("Gagal", error instanceof Error ? error.message : "Gagal memuat pengguna.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const selectedRole = (editUser?.role === "admin" ? "admin" : formData.role) as FormState["role"];
    const isAdminRole = selectedRole === "admin";
    const isStudentRole = selectedRole === "siswa";
    const isStaffBorrowerRole = selectedRole === "pegawai" || selectedRole === "guru";
    const showIdentityPhone = !isAdminRole;
    const showAddress = !isAdminRole;
    const showNipField = !isAdminRole && !isStudentRole;
    const roleOptions = getEditableRoleOptions(editUser?.role ?? null);
    const modalWidthClass = isStudentRole ? "max-w-2xl" : "max-w-lg";

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const searchableText = `${user.nama} ${user.username} ${user.no_telp || ""} ${user.nip || ""} ${user.nisn || ""}`.toLowerCase();
            const matchSearch = searchableText.includes(searchQuery.toLowerCase());
            const matchRole = !filterRole || user.role === filterRole;
            return matchSearch && matchRole;
        });
    }, [filterRole, searchQuery, users]);

    const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setFormData((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
        setShowPassword(false);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditUser(null);
        resetForm();
    };

    const openAddModal = () => {
        setEditUser(null);
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (user: UserData) => {
        setEditUser(user);
        setShowPassword(false);
        setFormData({
            nama: user.nama,
            username: user.username,
            role: user.role,
            password: "",
            nip: user.nip || "",
            alamat: user.alamat || "",
            no_telp: user.no_telp || "",
            nisn: user.nisn || "",
            kelas: user.kelas || "",
            konsentrasi_keahlian: user.konsentrasi_keahlian || "",
        });
        setShowModal(true);
    };

    const handleDelete = async (user: UserData) => {
        if (!canDeleteManagedUser(user.role)) {
            await showWarning("Perhatian", "Akun admin tidak bisa dihapus.");
            return;
        }

        const confirmed = await showConfirmDanger(
            "Hapus Pengguna?",
            `Akun ${user.nama} akan dihapus permanen.`,
            "Ya, Hapus",
            "Batal",
        );

        if (!confirmed) return;

        setDeletingUserId(user.id);
        try {
            const result = await manageUserAction({
                action: "delete",
                userId: user.id,
            });

            if (!result.success) throw new Error(result.error);

            await showSuccess("Berhasil", "Akun berhasil dihapus.");
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            await showError("Gagal", error instanceof Error ? error.message : "Gagal menghapus pengguna.");
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleBan = async (user: UserData) => {
        const duration = await showBanDialog(
            `Ban @${user.username}?`,
            "Pilih durasi ban atau cabut ban.",
            "Lanjutkan",
            "Batal"
        );

        if (!duration) return;

        let blockedUntil: string | null = null;
        if (duration === 'unban') {
            blockedUntil = null;
        } else if (duration === '1') {
            blockedUntil = new Date(Date.now() + 86400000).toISOString();
        } else if (duration === '7') {
            blockedUntil = new Date(Date.now() + 7 * 86400000).toISOString();
        } else if (duration === '30') {
            blockedUntil = new Date(Date.now() + 30 * 86400000).toISOString();
        } else if (duration === 'permanen') {
            blockedUntil = '9999-12-31';
        } else {
            return; // No option selected
        }

        setLoading(true);
        try {
            const result = await manageUserAction({
                action: 'ban',
                userId: user.id,
                blockedUntil
            });

            if (!result.success) throw new Error(result.error);

            await showSuccess("Berhasil", duration === 'unban' ? "Ban berhasil dicabut." : "Pengguna berhasil dibanned.");
            fetchUsers();
        } catch (error) {
            console.error("Error banning user:", error);
            await showError("Gagal", error instanceof Error ? error.message : "Gagal memproses ban.");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = async () => {
        if (!formData.nama.trim()) {
            await showWarning("Perhatian", "Nama wajib diisi.");
            return false;
        }

        if (!formData.username.trim()) {
            await showWarning("Perhatian", "Username wajib diisi.");
            return false;
        }

        if (!editUser && (!formData.password || formData.password.length < 5)) {
            await showWarning("Perhatian", "Password wajib diisi minimal 5 karakter untuk pengguna baru.");
            return false;
        }

        if (editUser && formData.password && formData.password.length < 5) {
            await showWarning("Perhatian", "Password baru minimal 5 karakter.");
            return false;
        }

        if (selectedRole === "guru" && !formData.nip) {
            await showWarning("Perhatian", "NIP wajib diisi untuk guru.");
            return false;
        }

        if (formData.nip && normalizeDigitsOnly(formData.nip).length !== 18) {
            await showWarning("Perhatian", "NIP harus tepat 18 digit.");
            return false;
        }

        if ((selectedRole === "pegawai" || selectedRole === "guru" || selectedRole === "siswa") && !formData.no_telp) {
            await showWarning("Perhatian", "Nomor telepon wajib diisi.");
            return false;
        }

        if ((selectedRole === "pegawai" || selectedRole === "guru" || selectedRole === "siswa") && !formData.alamat.trim()) {
            await showWarning("Perhatian", "Alamat wajib diisi.");
            return false;
        }

        if (isStudentRole) {
            if (!formData.nisn) {
                await showWarning("Perhatian", "NISN wajib diisi untuk siswa.");
                return false;
            }
            if (!formData.kelas.trim()) {
                await showWarning("Perhatian", "Kelas wajib diisi untuk siswa.");
                return false;
            }
            if (!formData.konsentrasi_keahlian.trim()) {
                await showWarning("Perhatian", "Konsentrasi keahlian wajib diisi untuk siswa.");
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!(await validateForm())) return;

        setSubmitting(true);
        try {
            const payload = {
                nama: formData.nama,
                username: formData.username,
                role: selectedRole,
                password: formData.password || undefined,
                nip: formData.nip,
                alamat: formData.alamat,
                no_telp: formData.no_telp,
                nisn: formData.nisn,
                kelas: formData.kelas,
                konsentrasi_keahlian: formData.konsentrasi_keahlian,
            };

            const result = editUser
                ? await manageUserAction({
                    action: "update",
                    userId: editUser.id,
                    userData: payload,
                })
                : await manageUserAction({
                    action: "create",
                    userData: payload,
                });

            if (!result.success) throw new Error(result.error);

            await showSuccess("Berhasil", editUser ? "Data pengguna berhasil diperbarui." : "Pengguna berhasil ditambahkan.");
            closeModal();
            fetchUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            await showError("Gagal", error instanceof Error ? error.message : "Gagal menyimpan pengguna.");
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role: UserData["role"]) => {
        switch (role) {
            case "admin":
                return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Admin</span>;
            case "operator":
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Operator</span>;
            case "pegawai":
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Pegawai</span>;
            case "guru":
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">Guru</span>;
            case "siswa":
                return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Siswa</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{getRoleLabel(role)}</span>;
        }
    };

    const getIdentityText = (user: UserData) => {
        if (user.role === "admin") return "-";
        if (user.role === "siswa") return user.nisn ? `NISN ${user.nisn}` : "-";
        return user.nip ? `NIP ${user.nip}` : "-";
    };

    const submitDisabled = !formData.nama.trim()
        || !formData.username.trim()
        || (!editUser && !formData.password);

    return (
        <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-auto">
                <Header title="Manajemen Pengguna" />

                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">Manajemen Pengguna</h1>
                    <p className="text-gray-500 mb-6">Kelola data pengguna sistem</p>

                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex gap-3">
                            <select
                                value={filterRole}
                                onChange={(event) => setFilterRole(event.target.value)}
                                className="border rounded-xl px-4 py-2 bg-white"
                            >
                                <option value="">Semua Peran</option>
                                <option value="admin">Admin</option>
                                <option value="operator">Operator</option>
                                <option value="pegawai">Pegawai</option>
                                <option value="guru">Guru</option>
                                <option value="siswa">Siswa</option>
                            </select>
                        </div>

                        <div className="flex gap-3 items-center">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    className="border rounded-xl pl-10 pr-4 py-2 bg-white"
                                    placeholder="Cari pengguna..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
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
                                        <th className="px-6 py-4 text-left">Identitas</th>
                                        <th className="px-6 py-4 text-left">Peran</th>
                                        <th className="px-6 py-4 text-left">Aksi</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium relative">
                                                        {user.nama.charAt(0).toUpperCase()}
                                                        {user.blocked_until && new Date(user.blocked_until) > new Date() && (
                                                            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white" title="Banned">
                                                                <ShieldAlert size={10} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-800">{user.nama}</span>
                                                        {user.blocked_until && new Date(user.blocked_until) > new Date() && (
                                                            <p className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                                                                DIBLOKIR SAMPAI {new Date(user.blocked_until).toLocaleDateString('id-ID')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div>
                                                    <p className="font-medium text-gray-700">@{user.username}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {user.no_telp ? `No. Telp ${user.no_telp}` : "Belum ada nomor telepon"}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{getIdentityText(user)}</td>
                                            <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    {canDeleteManagedUser(user.role) && (
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            disabled={deletingUserId === user.id}
                                                            className="border px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors disabled:opacity-50"
                                                        >
                                                            <Trash2 size={14} />
                                                            {deletingUserId === user.id ? "Menghapus..." : "Hapus"}
                                                        </button>
                                                    )}
                                                    {user.role !== 'admin' && user.role !== 'operator' && (
                                                        <button
                                                            onClick={() => handleBan(user)}
                                                            className={`border px-3 py-2 rounded-lg flex items-center gap-1 transition-colors ${user.blocked_until && new Date(user.blocked_until) > new Date() ? 'text-emerald-600 hover:bg-emerald-50' : 'text-orange-600 hover:bg-orange-50'}`}
                                                        >
                                                            <Ban size={14} />
                                                            {user.blocked_until && new Date(user.blocked_until) > new Date() ? "Cabut Ban" : "Ban"}
                                                        </button>
                                                    )}
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

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30">
                    <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
                        <div className={`bg-white w-full ${modalWidthClass} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl shadow-2xl p-5 sm:p-6 relative`}>
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X />
                            </button>

                            <h2 className="pr-10 text-xl sm:text-2xl font-semibold text-gray-800 mb-5 sm:mb-6">
                                {editUser ? "Edit Pengguna" : "Tambah Pengguna"}
                            </h2>

                            <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">
                                    {isStudentRole ? "Nama Lengkap" : "Nama"}
                                </label>
                                <input
                                    className="w-full border rounded-xl px-4 py-3"
                                    placeholder={isStudentRole ? "Nama lengkap siswa" : "Nama pengguna"}
                                    value={formData.nama}
                                    onChange={(event) => updateField("nama", event.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Username</label>
                                    <input
                                        className="w-full border rounded-xl px-4 py-3"
                                        placeholder="username"
                                        value={formData.username}
                                        onChange={(event) => updateField("username", event.target.value.toLowerCase())}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Email login internal dibuat otomatis dari username.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Peran</label>
                                    <select
                                        className={`w-full border rounded-xl px-4 py-3 ${editUser?.role === "admin" ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                                        value={selectedRole}
                                        disabled={editUser?.role === "admin"}
                                        onChange={(event) => updateField("role", event.target.value as FormState["role"])}
                                    >
                                        {roleOptions.map((roleOption) => (
                                            <option key={roleOption} value={roleOption}>
                                                {getRoleLabel(roleOption)}
                                            </option>
                                        ))}
                                    </select>
                                    {editUser?.role === "admin" && (
                                        <p className="text-xs text-gray-400 mt-1">Role admin dikunci dan tidak bisa diubah.</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">
                                    Kata Sandi {editUser ? "(kosongkan jika tidak diubah)" : ""}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full border rounded-xl px-4 py-3 pr-12"
                                        placeholder={editUser ? "Kosongkan jika tidak diubah" : "Kata sandi"}
                                        value={formData.password}
                                        onChange={(event) => updateField("password", event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((current) => !current)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {isStudentRole && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">NISN</label>
                                        <input
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="NISN"
                                            value={formData.nisn}
                                            onChange={(event) => updateField("nisn", normalizeDigitsOnly(event.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Kelas</label>
                                        <input
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="Contoh: XII RPL 1"
                                            value={formData.kelas}
                                            onChange={(event) => updateField("kelas", event.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {isStudentRole && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Konsentrasi Keahlian</label>
                                        <input
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="Contoh: Rekayasa Perangkat Lunak"
                                            value={formData.konsentrasi_keahlian}
                                            onChange={(event) => updateField("konsentrasi_keahlian", event.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">No Telp</label>
                                        <input
                                            className="w-full border rounded-xl px-4 py-3"
                                            placeholder="Nomor telepon"
                                            value={formData.no_telp}
                                            onChange={(event) => updateField("no_telp", normalizeDigitsOnly(event.target.value))}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isStudentRole && (showNipField || showIdentityPhone) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {showNipField && (
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">NIP</label>
                                            <input
                                                className="w-full border rounded-xl px-4 py-3"
                                                placeholder={selectedRole === "guru" ? "NIP wajib 18 digit" : "NIP (opsional)"}
                                                maxLength={18}
                                                value={formData.nip}
                                                onChange={(event) => updateField("nip", normalizeDigitsOnly(event.target.value))}
                                            />
                                        </div>
                                    )}
                                    {showIdentityPhone && (
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">No Telp</label>
                                            <input
                                                className="w-full border rounded-xl px-4 py-3"
                                                placeholder="Nomor telepon"
                                                value={formData.no_telp}
                                                onChange={(event) => updateField("no_telp", normalizeDigitsOnly(event.target.value))}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isStudentRole && showAddress && (
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Alamat</label>
                                    <textarea
                                        className="w-full border rounded-xl px-4 py-3 min-h-24 resize-none"
                                        placeholder="Alamat lengkap"
                                        value={formData.alamat}
                                        onChange={(event) => updateField("alamat", event.target.value)}
                                    />
                                </div>
                            )}

                            {isStudentRole && showAddress && (
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Alamat</label>
                                    <textarea
                                        className="w-full border rounded-xl px-4 py-3 min-h-24 resize-none"
                                        placeholder="Alamat lengkap"
                                        value={formData.alamat}
                                        onChange={(event) => updateField("alamat", event.target.value)}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={closeModal}
                                    className="px-5 py-2 border rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitDisabled || submitting}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? "Menyimpan..." : editUser ? "Simpan Perubahan" : "Tambah Pengguna"}
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
