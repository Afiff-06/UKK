"use client";

import { useRouter } from "next/navigation";
import { Package, ShieldCheck, BarChart3, ClipboardList, ArrowRight, Star } from "lucide-react";

const features = [
  {
    icon: <Package size={28} className="text-blue-600" />,
    title: "Pengelolaan Inventaris",
    desc: "Pantau dan kelola seluruh aset serta barang inventaris dengan mudah dan terstruktur.",
  },
  {
    icon: <ClipboardList size={28} className="text-blue-500" />,
    title: "Peminjaman Barang",
    desc: "Proses peminjaman dan pengembalian barang secara digital, cepat, dan akurat.",
  },
  {
    icon: <BarChart3 size={28} className="text-blue-600" />,
    title: "Laporan dan Analisis",
    desc: "Dapatkan laporan waktu nyata mengenai status aset, riwayat peminjaman, dan statistik penggunaan.",
  },
  {
    icon: <ShieldCheck size={28} className="text-blue-500" />,
    title: "Hak Akses",
    desc: "Sistem peran bertingkat (Admin, Operator, Pegawai) untuk memastikan keamanan dan efisiensi kerja tim.",
  },
];

const stats = [
  { value: "100%", label: "Waktu Nyata" },
  { value: "3", label: "Tingkat Akses" },
  { value: "24/7", label: "Ketersediaan" },
];

export default function Home() {
  const router = useRouter();

  // The proxy.ts already redirects authenticated users away from this page.
  // No auth check needed here.

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-hidden font-sans">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-900">Sistem Inventaris</span>
        </div>
        <button
          onClick={() => router.push("/auth/login")}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm"
        >
          Masuk <ArrowRight size={16} />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-1.5 rounded-full mb-6">
          <Star size={14} className="fill-blue-500 text-blue-500" />
          Sistem Manajemen Aset Terpadu
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 text-slate-900">
          Pengelolaan Aset
          <span className="block text-blue-600">
            yang Lebih Cerdas
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed">
          Platform manajemen inventaris modern untuk mengelola aset, peminjaman barang,
          dan laporan secara efisien dalam satu sistem yang terintegrasi.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-base shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Mulai Sekarang <ArrowRight size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-12 mt-16 justify-center">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {s.value}
              </div>
              <div className="text-slate-500 text-sm mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-6 text-center text-slate-500 text-sm mt-auto bg-slate-50/50">
        © 2026 Sistem Manajemen Inventaris. Hak cipta dilindungi undang-undang.
      </footer>
    </div>
  );
}
