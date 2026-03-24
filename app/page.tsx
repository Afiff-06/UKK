"use client";

import { useRouter } from "next/navigation";
import { Package, ShieldCheck, BarChart3, ClipboardList, ArrowRight, Star } from "lucide-react";

const features = [
  {
    icon: <Package size={28} className="text-blue-500" />,
    title: "Kelola Inventaris",
    desc: "Pantau dan kelola seluruh aset serta barang inventaris dengan mudah dan terstruktur.",
  },
  {
    icon: <ClipboardList size={28} className="text-indigo-500" />,
    title: "Peminjaman Barang",
    desc: "Proses peminjaman dan pengembalian barang secara digital, cepat dan akurat.",
  },
  {
    icon: <BarChart3 size={28} className="text-purple-500" />,
    title: "Laporan & Analitik",
    desc: "Dapatkan laporan real-time tentang status aset, riwayat peminjaman, dan statistik penggunaan.",
  },
  {
    icon: <ShieldCheck size={28} className="text-green-500" />,
    title: "Kontrol Akses",
    desc: "Sistem peran bertingkat (Admin, Operator, Pegawai) untuk keamanan dan efisiensi tim.",
  },
];

const stats = [
  { value: "100%", label: "Real-time" },
  { value: "3", label: "Level Akses" },
  { value: "24/7", label: "Tersedia" },
];

export default function Home() {
  const router = useRouter();

  // The proxy.ts already redirects authenticated users away from this page.
  // No auth check needed here.

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Inventaris</span>
        </div>
        <button
          onClick={() => router.push("/auth/login")}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-medium backdrop-blur-sm transition-all duration-200"
        >
          Masuk <ArrowRight size={16} />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
          <Star size={14} className="fill-blue-400 text-blue-400" />
          Sistem Manajemen Aset Terpadu
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Kelola Aset
          <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Lebih Cerdas
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
          Platform manajemen inventaris modern untuk mengelola aset, peminjaman barang,
          dan laporan dengan efisien dalam satu sistem terintegrasi.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold text-base shadow-2xl shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Mulai Sekarang <ArrowRight size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-12 mt-16 justify-center">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
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
              className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        © 2026 Sistem Manajemen Inventaris. All rights reserved.
      </footer>
    </div>
  );
}
