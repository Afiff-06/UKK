"use client";

import { useState, useEffect } from "react";
import {
    FileText,
    Download,
    Calendar,
    Filter,
    BarChart3,
    TrendingUp,
    Package,
    AlertTriangle,
    CheckCircle,
    Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

export default function LaporanPage() {
    const [activeTab, setActiveTab] = useState<'inventaris' | 'peminjaman'>('inventaris');

    // Inventaris state
    const [inventarisList, setInventarisList] = useState<any[]>([]);
    const [loadingInventaris, setLoadingInventaris] = useState(true);

    // Peminjaman state
    const [peminjamanList, setPeminjamanList] = useState<any[]>([]);
    const [loadingPeminjaman, setLoadingPeminjaman] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [peminjamanLoaded, setPeminjamanLoaded] = useState(false);

    const supabase = createClient();

    // Set default dates (client-side only)
    useEffect(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        setEndDate(today.toISOString().split('T')[0]);
        setStartDate(lastMonth.toISOString().split('T')[0]);
    }, []);

    // Auto-load inventaris on mount
    useEffect(() => {
        fetchInventaris();
    }, []);

    const fetchInventaris = async () => {
        setLoadingInventaris(true);
        try {
            const { data, error } = await supabase
                .from('inventaris')
                .select(`*, jenis:id_jenis (nama_jenis), ruang:id_ruang (nama_ruang)`)
                .order('kode_inventaris', { ascending: true });

            if (error) throw error;
            setInventarisList(data || []);
        } catch (err) {
            console.error('Error fetching inventaris:', err);
        } finally {
            setLoadingInventaris(false);
        }
    };

    const fetchPeminjaman = async () => {
        if (!startDate || !endDate) return;
        setLoadingPeminjaman(true);
        try {
            const { data, error } = await supabase
                .from('peminjaman')
                .select(`
                    *,
                    pegawai:id_pegawai (nama, email),
                    petugas:id_petugas (nama),
                    detail_peminjaman (
                        jumlah,
                        inventaris:id_inventaris (nama)
                    )
                `)
                .eq('status', 'dikembalikan')
                .gte('tanggal_pinjam', startDate)
                .lte('tanggal_pinjam', endDate)
                .order('tanggal_pinjam', { ascending: false });

            if (error) throw error;
            setPeminjamanList(data || []);
            setPeminjamanLoaded(true);
        } catch (err) {
            console.error('Error fetching peminjaman:', err);
        } finally {
            setLoadingPeminjaman(false);
        }
    };

    // ─── Excel Export ───────────────────────────────────────────────────────────
    const handleExportExcel = () => {
        let wb: XLSX.WorkBook;
        let filename: string;

        if (activeTab === 'inventaris') {
            const rows = inventarisList.map((item, i) => ({
                'No': i + 1,
                'Kode': `INV-${String(item.kode_inventaris).padStart(4, '0')}`,
                'Nama Barang': item.nama,
                'Jenis': item.jenis?.nama_jenis || '-',
                'Ruang': item.ruang?.nama_ruang || '-',
                'Jumlah': item.jumlah,
                'Kondisi': item.kondisi,
                'Keterangan': item.keterangan || '-',
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 20 },
                { wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 30 },
            ];
            wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventaris');
            filename = `laporan_inventaris_${new Date().toISOString().split('T')[0]}.xlsx`;

        } else {
            const rows = peminjamanList.map((item, i) => ({
                'No': i + 1,
                'Peminjam': item.pegawai?.nama || '-',
                'Email': item.pegawai?.email || '-',
                'Barang': item.detail_peminjaman?.map((d: any) => `${d.inventaris?.nama} (x${d.jumlah})`).join(', ') || '-',
                'Tanggal Pinjam': new Date(item.tanggal_pinjam).toLocaleDateString('id-ID'),
                'Tanggal Kembali': item.tanggal_kembali ? new Date(item.tanggal_kembali).toLocaleDateString('id-ID') : '-',
                'Status': item.status,
                'Petugas': item.petugas?.nama || '-',
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 40 },
                { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
            ];
            wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Peminjaman');
            filename = `laporan_peminjaman_${startDate}_sd_${endDate}.xlsx`;
        }

        XLSX.writeFile(wb, filename);
    };

    // ─── Helpers ────────────────────────────────────────────────────────────────
    const getKondisiBadge = (kondisi: string) => {
        const map: Record<string, string> = {
            'Baik': 'bg-green-100 text-green-700',
            'Rusak Ringan': 'bg-yellow-100 text-yellow-700',
            'Rusak Berat': 'bg-red-100 text-red-700',
        };
        return map[kondisi] || 'bg-gray-100 text-gray-700';
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { cls: string; label: string }> = {
            'dikembalikan': { cls: 'bg-green-100 text-green-700', label: 'Dikembalikan' },
            'disetujui':    { cls: 'bg-blue-100 text-blue-700',   label: 'Dipinjam' },
            'konfirmasi':   { cls: 'bg-indigo-100 text-indigo-700', label: 'Konfirmasi' },
            'pending':      { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
            'ditolak':      { cls: 'bg-red-100 text-red-700',    label: 'Ditolak' },
        };
        const s = map[status] || { cls: 'bg-gray-100 text-gray-700', label: status };
        return <span className={`px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
    };

    const peminjamanStats = {
        total: peminjamanList.length,
        dikembalikan: peminjamanList.filter(p => p.status === 'dikembalikan').length,
        aktif: peminjamanList.filter(p => p.status === 'disetujui').length,
    };

    const canExport = activeTab === 'inventaris'
        ? inventarisList.length > 0
        : peminjamanLoaded && peminjamanList.length > 0;

    return (
        <div className="min-h-screen bg-[#f5f7fb] w-full">
            <main className="flex-1 flex flex-col">
                <Header title="Laporan" />

                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-1 text-gray-800">Laporan</h1>
                            <p className="text-gray-500">Export data inventaris dan peminjaman ke Excel</p>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportExcel}
                            disabled={!canExport}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl shadow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        {([
                            { key: 'inventaris', label: 'Inventaris', icon: <Package size={16} /> },
                            { key: 'peminjaman',  label: 'Peminjaman', icon: <FileText size={16} /> },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-white shadow-md text-blue-600 border border-blue-100'
                                        : 'text-gray-500 hover:bg-white/60'
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── INVENTARIS TAB ── */}
                    {activeTab === 'inventaris' && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-gray-800">Data Inventaris Barang</h2>
                                    <p className="text-sm text-gray-500">Total: {inventarisList.length} barang</p>
                                </div>
                            </div>

                            {loadingInventaris ? (
                                <div className="p-12"><LoadingSpinner /></div>
                            ) : inventarisList.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Package className="mx-auto text-gray-300 mb-3" size={48} />
                                    <p className="text-gray-500">Tidak ada data inventaris</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-gray-500 text-sm">
                                            <tr>
                                                <th className="px-5 py-3 text-left">No</th>
                                                <th className="px-5 py-3 text-left">Kode</th>
                                                <th className="px-5 py-3 text-left">Nama Barang</th>
                                                <th className="px-5 py-3 text-left">Jenis</th>
                                                <th className="px-5 py-3 text-left">Ruang</th>
                                                <th className="px-5 py-3 text-center">Jumlah</th>
                                                <th className="px-5 py-3 text-left">Kondisi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {inventarisList.map((item, i) => (
                                                <tr key={item.id_inventaris} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 text-gray-500 text-sm">{i + 1}</td>
                                                    <td className="px-5 py-3 font-mono text-sm text-gray-600">
                                                        INV-{String(item.kode_inventaris).padStart(4, '0')}
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-gray-800">{item.nama}</td>
                                                    <td className="px-5 py-3 text-gray-600">{item.jenis?.nama_jenis || '-'}</td>
                                                    <td className="px-5 py-3 text-gray-600">{item.ruang?.nama_ruang || '-'}</td>
                                                    <td className="px-5 py-3 text-center font-semibold text-gray-800">{item.jumlah}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getKondisiBadge(item.kondisi)}`}>
                                                            {item.kondisi}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PEMINJAMAN TAB ── */}
                    {activeTab === 'peminjaman' && (
                        <div className="space-y-4">
                            {/* Date Filter */}
                            <div className="bg-white rounded-2xl shadow-sm p-5">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Filter size={16} /> Filter Tanggal
                                </h2>
                                <div className="flex gap-4 items-end flex-wrap">
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="border rounded-xl px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1">Tanggal Akhir</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="border rounded-xl px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={fetchPeminjaman}
                                        disabled={loadingPeminjaman || !startDate || !endDate}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                                    >
                                        {loadingPeminjaman ? <LoadingSpinner size="sm" /> : <BarChart3 size={16} />}
                                        Tampilkan
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            {peminjamanLoaded && (
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Peminjaman', val: peminjamanStats.total, color: 'blue', Icon: FileText },
                                        { label: 'Dikembalikan', val: peminjamanStats.dikembalikan, color: 'green', Icon: CheckCircle },
                                        { label: 'Masih Dipinjam', val: peminjamanStats.aktif, color: 'orange', Icon: Clock },
                                    ].map(({ label, val, color, Icon }) => (
                                        <div key={label} className={`bg-${color}-50 rounded-2xl p-5 flex items-center gap-4`}>
                                            <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                                                <Icon className={`text-${color}-600`} size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">{label}</p>
                                                <p className="text-2xl font-bold text-gray-800">{val}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Table */}
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                {!peminjamanLoaded && !loadingPeminjaman ? (
                                    <div className="p-12 text-center">
                                        <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
                                        <p className="text-gray-500">Pilih rentang tanggal lalu klik <strong>Tampilkan</strong></p>
                                    </div>
                                ) : loadingPeminjaman ? (
                                    <div className="p-12"><LoadingSpinner /></div>
                                ) : peminjamanList.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                                        <p className="text-gray-500">Tidak ada data peminjaman pada periode ini</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-5 border-b">
                                            <h2 className="font-semibold text-gray-800">Data Peminjaman</h2>
                                            <p className="text-sm text-gray-500">
                                                {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                {' — '}
                                                {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left">No</th>
                                                        <th className="px-5 py-3 text-left">Peminjam</th>
                                                        <th className="px-5 py-3 text-left">Barang</th>
                                                        <th className="px-5 py-3 text-left">Tgl Pinjam</th>
                                                        <th className="px-5 py-3 text-left">Tgl Kembali</th>
                                                        <th className="px-5 py-3 text-left">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {peminjamanList.map((item, i) => (
                                                        <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                            <td className="px-5 py-3 text-gray-500 text-sm">{i + 1}</td>
                                                            <td className="px-5 py-3">
                                                                <p className="font-medium text-gray-800">{item.pegawai?.nama || '-'}</p>
                                                                <p className="text-xs text-gray-400">{item.pegawai?.email || ''}</p>
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600 text-sm">
                                                                {item.detail_peminjaman?.map((d: any) =>
                                                                    `${d.inventaris?.nama} (x${d.jumlah})`
                                                                ).join(', ') || '-'}
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600 text-sm">
                                                                {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID')}
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600 text-sm">
                                                                {item.tanggal_kembali
                                                                    ? new Date(item.tanggal_kembali).toLocaleDateString('id-ID')
                                                                    : <span className="text-gray-400">-</span>}
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                {getStatusBadge(item.status)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
