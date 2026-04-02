"use client";

import { useState, useEffect, ReactNode } from "react";
import {
    Plus,
    Minus,
    ChevronDown,
    Trash2,
    Search,
    Check,
    X,
    Package,
    User,
    Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import TimePicker from "@/components/time-picker";
import { showSuccess, showError, showWarning } from "@/lib/swal";
import { BORROWER_ROLES, getRoleLabel, isBorrowerRole } from "@/lib/roles";

interface Inventaris {
    id_inventaris: string;
    nama: string;
    jumlah: number;
    kode_inventaris: number;
}

interface User {
    id: string;
    nama: string;
    username: string;
    role: string;
}

interface SelectedItem {
    id_inventaris: string;
    nama: string;
    qty: number;
    maxQty: number;
}

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

export default function PeminjamanForm() {
    const [items, setItems] = useState<SelectedItem[]>([]);
    const [inventaris, setInventaris] = useState<Inventaris[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState<User | null>(null);
    const [tanggalPinjam, setTanggalPinjam] = useState("");
    const [tanggalKembali, setTanggalKembali] = useState("");
    const [jamPinjam, setJamPinjam] = useState("08:00");
    const [jamKembali, setJamKembali] = useState("16:00");
    const [showItemSelector, setShowItemSelector] = useState(false);
    const [showPegawaiSelector, setShowPegawaiSelector] = useState(false);
    const [searchItem, setSearchItem] = useState("");
    const [searchPegawai, setSearchPegawai] = useState("");

    const router = useRouter();
    const { role, profile } = useAuth();
    const supabase = createClient();
    const todayDate = formatDateInput(new Date());
    const borrowerMode = isBorrowerRole(role);

    // Initialize date on client side
    useEffect(() => {
        const today = new Date();
        setTanggalPinjam(today.toISOString().split('T')[0]);
        setJamPinjam(`${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`);
        
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        setTanggalKembali(nextWeek.toISOString().split('T')[0]);
        setJamKembali("16:00");
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all items that have non-Baik condition records
                const { data: damagedRecords } = await supabase
                    .from('inventaris')
                    .select('nama')
                    .neq('kondisi', 'Baik');
                
                const damagedNames = new Set((damagedRecords || []).map(r => r.nama));

                // Fetch inventaris with 'Baik' condition
                const { data: invData } = await supabase
                    .from('inventaris')
                    .select('id_inventaris, nama, jumlah, kode_inventaris')
                    .eq('kondisi', 'Baik')
                    .gt('jumlah', 0)
                    .order('nama');

                // Filter out items that have any damaged record with the same name
                const filteredInv = (invData || []).filter(item => !damagedNames.has(item.nama));

                // Fetch borrower users from tb_user
                const { data: usrData } = await supabase
                    .from('tb_user')
                    .select('id, nama, username, role')
                    .in('role', [...BORROWER_ROLES]);

                if (filteredInv) setInventaris(filteredInv);
                if (usrData) setUsers(usrData);

                // Borrower roles automatically select themselves
                if (borrowerMode && profile) {
                    setSelectedPegawai({
                        id: profile.id,
                        nama: profile.nama,
                        username: profile.username,
                        role: role || "pegawai",
                    });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [borrowerMode, profile, role, supabase]);

    const updateQty = (id: string, deltaOrValue: number, isAbsolute: boolean = false) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id_inventaris === id
                    ? {
                        ...item,
                        qty: isAbsolute
                            ? Math.max(0, Math.min(item.maxQty, deltaOrValue))
                            : Math.max(0, Math.min(item.maxQty, item.qty + deltaOrValue))
                    }
                    : item
            )
        );
    };

    const addItem = (inv: Inventaris) => {
        if (items.find(i => i.id_inventaris === inv.id_inventaris)) {
            return; // Already added
        }
        setItems([...items, {
            id_inventaris: inv.id_inventaris,
            nama: inv.nama,
            qty: 1,
            maxQty: inv.jumlah,
        }]);
        setShowItemSelector(false);
        setSearchItem("");
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id_inventaris !== id));
    };

    const handleSubmit = async () => {
        if (!selectedPegawai || items.length === 0) {
            await showWarning('Perhatian', 'Pilih peminjam dan tambahkan barang terlebih dahulu');
            return;
        }

        if (jamPinjam < "07:00" || jamPinjam > "15:00" || jamKembali < "07:00" || jamKembali > "15:00") {
            await showWarning('Waktu Tidak Valid', 'Waktu peminjaman dan pengembalian hanya diperbolehkan antara jam 07:00 dan 15:00');
            return;
        }

        setSubmitting(true);
        try {
            // Create peminjaman
            const { data: peminjaman, error: peminjamanError } = await supabase
                .from('peminjaman')
                .insert({
                    id_pegawai: selectedPegawai.id,
                    id_petugas: profile?.id,
                    tanggal_pinjam: tanggalPinjam,
                    tanggal_kembali: tanggalKembali,
                    jam_pinjam: jamPinjam,
                    jam_kembali: jamKembali,
                    status: borrowerMode ? 'konfirmasi_peminjaman' : 'dipinjam',
                })
                .select()
                .single();

            if (peminjamanError) throw peminjamanError;

            // Create detail peminjaman
            const details = items.map(item => ({
                id_peminjaman: peminjaman.id_peminjaman,
                id_inventaris: item.id_inventaris,
                jumlah: item.qty,
            }));

            const { error: detailError } = await supabase
                .from('detail_peminjaman')
                .insert(details);

            if (detailError) throw detailError;

            // Update stock if approved (operator side)
            if (!borrowerMode) {
                for (const item of items) {
                    const currentInv = inventaris.find(i => i.id_inventaris === item.id_inventaris);
                    if (currentInv) {
                        const { error: stockError } = await supabase
                            .from('inventaris')
                            .update({ jumlah: currentInv.jumlah - item.qty })
                            .eq('id_inventaris', item.id_inventaris);

                        if (stockError) console.error('Stock update error:', stockError);
                    }
                }
            }

            await showSuccess('Berhasil!', borrowerMode ? 'Peminjaman berhasil diajukan dan menunggu persetujuan.' : 'Peminjaman berhasil diproses.');
            router.push('/pegawai/peminjaman');

        } catch (error) {
            console.error('Error creating peminjaman:', error);
            await showError('Gagal', 'Gagal membuat peminjaman');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredInventaris = inventaris.filter(inv =>
        inv.nama.toLowerCase().includes(searchItem.toLowerCase()) &&
        !items.find(i => i.id_inventaris === inv.id_inventaris)
    );

    const filteredUsers = users.filter(usr =>
        usr.nama.toLowerCase().includes(searchPegawai.toLowerCase()) ||
        usr.username.toLowerCase().includes(searchPegawai.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 bg-[#f5f7fb] flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f5f7fb] flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col overflow-auto">
                <Header title="Peminjaman" />

                <div className="p-8">
                    <button
                        onClick={() => router.back()}
                        className="mb-4 text-gray-500 hover:text-gray-800 flex items-center gap-2 transition-colors"
                    >
                        <X size={18} /> Batal
                    </button>

                    <h1 className="text-3xl font-bold mb-2 text-gray-800">
                        {borrowerMode ? 'Ajukan Peminjaman' : 'Form Peminjaman Barang'}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {borrowerMode
                            ? 'Ajukan peminjaman barang ke operator'
                            : 'Proses peminjaman barang untuk peminjam'
                        }
                    </p>

                    <div className="bg-white rounded-3xl shadow-lg p-8 space-y-8 max-w-4xl">
                        {/* PILIH PEGAWAI */}
                        {!borrowerMode && (
                            <Section title="Pilih Peminjam" icon={<User size={16} />}>
                                <div
                                    onClick={() => setShowPegawaiSelector(true)}
                                    className="border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    {selectedPegawai ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                                                {selectedPegawai.nama.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{selectedPegawai.nama}</p>
                                                <p className="text-sm text-gray-400">{getRoleLabel(selectedPegawai.role)} • @{selectedPegawai.username}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">Pilih pengguna...</span>
                                    )}
                                    <ChevronDown className="text-gray-400" />
                                </div>

                                {showPegawaiSelector && (
                                    <div className="mt-2 border rounded-xl shadow-lg bg-white max-h-64 overflow-hidden">
                                        <div className="p-3 border-b">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                                    placeholder="Cari nama atau username..."
                                                    value={searchPegawai}
                                                    onChange={(e) => setSearchPegawai(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredUsers.map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => {
                                                        setSelectedPegawai(user);
                                                        setShowPegawaiSelector(false);
                                                        setSearchPegawai("");
                                                    }}
                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                                        {user.nama.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{user.nama}</p>
                                                        <p className="text-xs text-gray-400">{getRoleLabel(user.role)} • @{user.username}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* PILIH BARANG */}
                        <Section title="Pilih Barang & Jumlah" icon={<Package size={16} />}>
                            <div className="border rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-12 bg-gray-50 px-6 py-3 text-sm text-gray-500">
                                    <div className="col-span-12 md:col-span-7">Barang</div>
                                    <div className="col-span-6 md:col-span-3">Jumlah</div>
                                    <div className="col-span-6 md:col-span-2"></div>
                                </div>

                                {items.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-gray-400">
                                        <Package className="mx-auto mb-2" size={32} />
                                        <p>Belum ada barang dipilih</p>
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.id_inventaris}
                                            className="grid grid-cols-12 items-center px-6 py-4 border-t gap-4"
                                        >
                                            <div className="col-span-12 md:col-span-7 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <Package className="text-blue-600" size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-gray-800 block truncate">{item.nama}</span>
                                                    <p className="text-xs text-gray-400">Stok: {item.maxQty}</p>
                                                </div>
                                            </div>

                                            <div className="col-span-6 md:col-span-3 flex items-center gap-2">
                                                <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                                                    <button
                                                        onClick={() => updateQty(item.id_inventaris, -1)}
                                                        className="px-3 py-2 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.maxQty}
                                                        value={item.qty}
                                                        onChange={(e) => updateQty(item.id_inventaris, parseInt(e.target.value) || 0, true)}
                                                        className="w-12 text-center font-medium focus:outline-none border-x py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        onClick={() => updateQty(item.id_inventaris, 1)}
                                                        className="px-3 py-2 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="col-span-6 md:col-span-2 flex justify-end">
                                                <button
                                                    onClick={() => removeItem(item.id_inventaris)}
                                                    className="border px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="p-4 border-t">
                                    <button
                                        onClick={() => setShowItemSelector(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
                                    >
                                        <Plus size={16} />
                                        Tambah Barang
                                    </button>
                                </div>
                            </div>

                            {showItemSelector && (
                                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                                        <div className="p-4 border-b flex items-center justify-between">
                                            <h3 className="font-semibold">Pilih Barang</h3>
                                            <button onClick={() => {
                                                setShowItemSelector(false);
                                                setSearchItem("");
                                            }}>
                                                <X className="text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="p-4 border-b">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                                <input
                                                    className="w-full pl-9 pr-4 py-2 border rounded-lg"
                                                    placeholder="Cari barang..."
                                                    value={searchItem}
                                                    onChange={(e) => setSearchItem(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {filteredInventaris.map(inv => (
                                                <div
                                                    key={inv.id_inventaris}
                                                    onClick={() => addItem(inv)}
                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                                            <Package className="text-blue-600" size={14} />
                                                        </div>
                                                        <span className="font-medium">{inv.nama}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-400">Stok: {inv.jumlah}</span>
                                                </div>
                                            ))}
                                            {filteredInventaris.length === 0 && (
                                                <p className="px-4 py-8 text-gray-400 text-center">Tidak ada barang tersedia</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* TANGGAL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Section title="Waktu Peminjaman" icon={<Calendar size={16} />}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Tanggal Peminjaman</label>
                                        <input
                                            type="date"
                                            value={tanggalPinjam}
                                            onChange={(e) => setTanggalPinjam(e.target.value)}
                                            min={todayDate}
                                            className="w-full border rounded-xl px-4 py-3 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <TimePicker
                                            label="Jam Peminjaman"
                                            value={jamPinjam}
                                            onChange={setJamPinjam}
                                            minHour={7}
                                            maxHour={15}
                                        />
                                    </div>
                                </div>
                            </Section>
                            <Section title="Waktu Pengembalian" icon={<Calendar size={16} />}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Tanggal Pengembalian</label>
                                        <input
                                            type="date"
                                            value={tanggalKembali}
                                            onChange={(e) => setTanggalKembali(e.target.value)}
                                            min={tanggalPinjam || todayDate}
                                            className="w-full border rounded-xl px-4 py-3 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <TimePicker
                                            label="Jam Pengembalian"
                                            value={jamKembali}
                                            onChange={setJamKembali}
                                            minHour={7}
                                            maxHour={15}
                                        />
                                    </div>
                                </div>
                            </Section>
                        </div>

                        {/* ACTION */}
                        <div className="flex flex-col md:flex-row justify-end gap-3 pt-4">
                            <button
                                onClick={() => router.push('/pegawai/peminjaman')}
                                className="px-6 py-2 border rounded-xl hover:bg-gray-50 transition-colors order-2 md:order-1"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || items.length === 0 || (!selectedPegawai && !borrowerMode)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center order-1 md:order-2"
                            >
                                {submitting ? <LoadingSpinner size="sm" /> : <Check size={18} />}
                                {borrowerMode ? 'Ajukan Peminjaman' : 'Proses Peminjaman'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 font-semibold text-gray-700">
                <span className="text-blue-500">{icon}</span>
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}
