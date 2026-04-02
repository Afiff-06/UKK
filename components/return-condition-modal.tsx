"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Package } from "lucide-react";
import LoadingSpinner from "./loading-spinner";

interface ReturnConditionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (counts: { baik: number; rusak_ringan: number; rusak_berat: number }) => Promise<void>;
    itemName: string;
    totalQuantity: number;
}

export default function ReturnConditionModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    totalQuantity
}: ReturnConditionModalProps) {
    const [counts, setCounts] = useState({
        baik: totalQuantity,
        rusak_ringan: 0,
        rusak_berat: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCounts({
                baik: totalQuantity,
                rusak_ringan: 0,
                rusak_berat: 0
            });
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, totalQuantity]);

    const currentTotal = counts.baik + counts.rusak_ringan + counts.rusak_berat;
    const isReady = currentTotal === totalQuantity;

    const handleConfirm = async () => {
        if (!isReady) {
            setError(`Total harus sama dengan jumlah yang dipinjam (${totalQuantity}).`);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(counts);
            onClose();
        } catch (e: any) {
            setError(e.message || "Gagal memproses pengembalian.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b flex items-center justify-between bg-blue-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Konfirmasi Kondisi</h3>
                            <p className="text-xs text-blue-100 opacity-90">{itemName}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 mb-1 font-medium">Total Barang Terdeteksi</p>
                        <p className="text-3xl font-black text-gray-800">{totalQuantity}</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Kondisi Baik
                                </label>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Terbaik</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={totalQuantity}
                                className="w-full border rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                value={counts.baik}
                                onChange={(e) => setCounts({ ...counts, baik: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Rusak Ringan
                                </label>
                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Perbaikan</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={totalQuantity}
                                className="w-full border rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                value={counts.rusak_ringan}
                                onChange={(e) => setCounts({ ...counts, rusak_ringan: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Rusak Berat
                                </label>
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Ganti</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={totalQuantity}
                                className="w-full border rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                value={counts.rusak_berat}
                                onChange={(e) => setCounts({ ...counts, rusak_berat: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl">
                        <div className={currentTotal !== totalQuantity ? "text-red-500" : "text-green-600"}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Total Dialokasi</p>
                            <p className="text-xl font-black">{currentTotal} / {totalQuantity}</p>
                        </div>
                        {currentTotal !== totalQuantity && (
                            <div className="text-[10px] text-gray-400 italic font-medium max-w-[120px] text-right">
                                {currentTotal < totalQuantity ? `Tambah ${totalQuantity - currentTotal} lagi` : `Kurangi ${currentTotal - totalQuantity}`}
                            </div>
                        )}
                        {currentTotal === totalQuantity && (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle size={20} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors font-bold text-sm"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isReady || isSubmitting}
                        className="flex-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-100 font-bold text-sm disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <LoadingSpinner size="sm" /> : <CheckCircle size={18} />}
                        Konfirmasi Pengembalian
                    </button>
                </div>
            </div>
        </div>
    );
}
