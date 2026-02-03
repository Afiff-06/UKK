"use client";

import { useState, useEffect } from "react";
import {
    FileText,
    Download,
    Calendar,
    Filter,
    Printer,
    BarChart3,
    TrendingUp,
    Package,
} from "lucide-react";
import SidebarUtama from "@/components/sidebar-utama";
import Header from "@/components/header";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/loading-spinner";

interface ReportData {
    totalPeminjaman: number;
    totalDikembalikan: number;
    totalTerlambat: number;
    totalBarang: number;
    peminjamanList: any[];
}

export default function LaporanPage() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reportType, setReportType] = useState<'peminjaman' | 'inventaris'>('peminjaman');
    const [initialized, setInitialized] = useState(false);

    // Initialize dates on client side to avoid Next.js 16 prerender issues
    useEffect(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        setEndDate(today.toISOString().split('T')[0]);
        setStartDate(lastMonth.toISOString().split('T')[0]);
        setInitialized(true);
    }, []);

    const supabase = createClient();

    const generateReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'peminjaman') {
                // Fetch peminjaman data
                const { data: peminjaman, error } = await supabase
                    .from('peminjaman')
                    .select(`
                        *,
                        pegawai:id_pegawai (nama, email),
                        petugas:id_petugas (nama_petugas),
                        detail_peminjaman (
                            jumlah,
                            inventaris:id_inventaris (nama)
                        )
                    `)
                    .gte('tanggal_pinjam', startDate)
                    .lte('tanggal_pinjam', endDate)
                    .order('tanggal_pinjam', { ascending: false });

                if (error) throw error;

                const totalPeminjaman = peminjaman?.length || 0;
                const totalDikembalikan = peminjaman?.filter(p => p.status === 'dikembalikan').length || 0;
                const totalTerlambat = peminjaman?.filter(p => {
                    if (p.status === 'dikembalikan') return false;
                    const borrowed = new Date(p.tanggal_pinjam);
                    const today = new Date();
                    return (today.getTime() - borrowed.getTime()) / (1000 * 60 * 60 * 24) > 7;
                }).length || 0;

                setReportData({
                    totalPeminjaman,
                    totalDikembalikan,
                    totalTerlambat,
                    totalBarang: 0,
                    peminjamanList: peminjaman || [],
                });
            } else {
                // Fetch inventaris data
                const { data: inventaris, error } = await supabase
                    .from('inventaris')
                    .select(`
                        *,
                        jenis:id_jenis (nama_jenis),
                        ruang:id_ruang (nama_ruang)
                    `)
                    .order('kode_inventaris', { ascending: true });

                if (error) throw error;

                setReportData({
                    totalPeminjaman: 0,
                    totalDikembalikan: 0,
                    totalTerlambat: 0,
                    totalBarang: inventaris?.length || 0,
                    peminjamanList: inventaris || [],
                });
            }
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (!reportData) return;

        let csvContent = '';

        if (reportType === 'peminjaman') {
            csvContent = 'No,Peminjam,Barang,Tanggal Pinjam,Status\n';
            reportData.peminjamanList.forEach((item, index) => {
                const barang = item.detail_peminjaman?.map((d: any) => d.inventaris?.nama).join('; ') || '-';
                csvContent += `${index + 1},"${item.pegawai?.nama || '-'}","${barang}",${item.tanggal_pinjam},${item.status}\n`;
            });
        } else {
            csvContent = 'Kode,Nama Barang,Jenis,Ruang,Jumlah,Kondisi\n';
            reportData.peminjamanList.forEach((item) => {
                csvContent += `INV-${String(item.kode_inventaris).padStart(4, '0')},"${item.nama}","${item.jenis?.nama_jenis || '-'}","${item.ruang?.nama_ruang || '-'}",${item.jumlah},${item.kondisi}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laporan_${reportType}_${startDate}_${endDate}.csv`;
        link.click();
    };

    return (
        <SidebarUtama>
            <div className="min-h-screen bg-[#f5f7fb] w-full">
                <main className="flex-1 flex flex-col">
                    <Header title="Laporan" />

                    <div className="p-8">
                        <h1 className="text-3xl font-bold mb-2 text-gray-800">Generate Laporan</h1>
                        <p className="text-gray-500 mb-6">Buat laporan peminjaman dan inventaris</p>

                        {/* Filter Section */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Filter size={18} /> Filter Laporan
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Jenis Laporan</label>
                                    <select
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value as 'peminjaman' | 'inventaris')}
                                        className="w-full border rounded-xl px-4 py-3"
                                    >
                                        <option value="peminjaman">Laporan Peminjaman</option>
                                        <option value="inventaris">Laporan Inventaris</option>
                                    </select>
                                </div>

                                {reportType === 'peminjaman' && (
                                    <>
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">Tanggal Mulai</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full border rounded-xl px-4 py-3"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">Tanggal Akhir</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full border rounded-xl px-4 py-3"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex items-end">
                                    <button
                                        onClick={generateReport}
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <LoadingSpinner size="sm" /> : <BarChart3 size={18} />}
                                        Generate Laporan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Report Preview */}
                        {reportData && (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none">
                                {/* Report Header */}
                                <div className="p-6 border-b flex justify-between items-center print:hidden">
                                    <div>
                                        <h2 className="font-semibold text-gray-800">
                                            {reportType === 'peminjaman' ? 'Laporan Peminjaman' : 'Laporan Inventaris'}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            {reportType === 'peminjaman'
                                                ? `Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`
                                                : `Total: ${reportData.totalBarang} barang`
                                            }
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handlePrint}
                                            className="border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                        >
                                            <Printer size={16} /> Cetak
                                        </button>
                                        <button
                                            onClick={handleExportCSV}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Download size={16} /> Export CSV
                                        </button>
                                    </div>
                                </div>

                                {/* Summary Cards (for peminjaman) */}
                                {reportType === 'peminjaman' && (
                                    <div className="grid grid-cols-3 gap-4 p-6 border-b">
                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <FileText className="text-blue-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Total Peminjaman</p>
                                                    <p className="text-xl font-bold text-gray-800">{reportData.totalPeminjaman}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <TrendingUp className="text-green-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Dikembalikan</p>
                                                    <p className="text-xl font-bold text-gray-800">{reportData.totalDikembalikan}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                    <Calendar className="text-red-600" size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Terlambat</p>
                                                    <p className="text-xl font-bold text-gray-800">{reportData.totalTerlambat}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Data Table */}
                                <div className="overflow-x-auto">
                                    {reportType === 'peminjaman' ? (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 text-gray-500 text-sm">
                                                <tr>
                                                    <th className="px-6 py-3 text-left">No</th>
                                                    <th className="px-6 py-3 text-left">Peminjam</th>
                                                    <th className="px-6 py-3 text-left">Barang</th>
                                                    <th className="px-6 py-3 text-left">Tanggal Pinjam</th>
                                                    <th className="px-6 py-3 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {reportData.peminjamanList.map((item, index) => (
                                                    <tr key={item.id_peminjaman} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">{index + 1}</td>
                                                        <td className="px-6 py-4">{item.pegawai?.nama || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            {item.detail_peminjaman?.map((d: any) => d.inventaris?.nama).join(', ') || '-'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {new Date(item.tanggal_pinjam).toLocaleDateString('id-ID')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs ${item.status === 'dikembalikan'
                                                                ? 'bg-green-100 text-green-700'
                                                                : item.status === 'disetujui'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-gray-50 text-gray-500 text-sm">
                                                <tr>
                                                    <th className="px-6 py-3 text-left">Kode</th>
                                                    <th className="px-6 py-3 text-left">Nama Barang</th>
                                                    <th className="px-6 py-3 text-left">Jenis</th>
                                                    <th className="px-6 py-3 text-left">Ruang</th>
                                                    <th className="px-6 py-3 text-center">Jumlah</th>
                                                    <th className="px-6 py-3 text-left">Kondisi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {reportData.peminjamanList.map((item) => (
                                                    <tr key={item.id_inventaris} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-mono text-sm">
                                                            INV-{String(item.kode_inventaris).padStart(4, '0')}
                                                        </td>
                                                        <td className="px-6 py-4">{item.nama}</td>
                                                        <td className="px-6 py-4">{item.jenis?.nama_jenis || '-'}</td>
                                                        <td className="px-6 py-4">{item.ruang?.nama_ruang || '-'}</td>
                                                        <td className="px-6 py-4 text-center">{item.jumlah}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs ${item.kondisi === 'Baik'
                                                                ? 'bg-green-100 text-green-700'
                                                                : item.kondisi === 'Rusak Ringan'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {item.kondisi}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {reportData.peminjamanList.length === 0 && (
                                    <div className="p-12 text-center">
                                        <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                                        <p className="text-gray-500">Tidak ada data untuk periode ini</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!reportData && !loading && (
                            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                                <FileText className="mx-auto text-gray-300 mb-4" size={64} />
                                <h3 className="text-lg font-medium text-gray-700 mb-2">Belum Ada Laporan</h3>
                                <p className="text-gray-500">Pilih filter dan klik "Generate Laporan" untuk melihat data</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </SidebarUtama>
    );
}
