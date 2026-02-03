"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Pertama, cek di tabel petugas (untuk admin/operator)
      const { data: petugas, error: petugasError } = await supabase
        .from('petugas')
        .select('id_petugas, username, password, nama_petugas, level_id')
        .eq('username', username)
        .single();

      if (petugas && !petugasError) {
        // Verifikasi password (simple comparison - dalam produksi gunakan hash)
        if (petugas.password === password) {
          // Login berhasil untuk petugas
          // Simpan info ke localStorage untuk sementara (karena tidak menggunakan Supabase Auth)
          localStorage.setItem('petugas_session', JSON.stringify({
            id: petugas.id_petugas,
            nama: petugas.nama_petugas,
            username: petugas.username,
            level_id: petugas.level_id,
          }));

          // Sign in dengan Supabase Auth menggunakan service account atau dummy
          // Untuk sekarang, langsung redirect
          router.push("/dashboard");
          return;
        } else {
          throw new Error("Username atau password salah");
        }
      }

      // Jika tidak ditemukan di petugas, coba login dengan Supabase Auth (email)
      // Cek apakah input adalah email
      if (username.includes('@')) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });

        if (authError) {
          throw new Error("Email atau password salah");
        }

        router.push("/dashboard");
        return;
      }

      // Jika bukan email dan tidak ditemukan di petugas
      throw new Error("Username tidak ditemukan");

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Aset</h1>
          <p className="text-gray-500 mt-2">Masuk ke akun Anda</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin}>
            {/* Username/Email */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username / Email
              </label>
              <input
                type="text"
                id="username"
                placeholder="Masukkan username atau email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Masukkan password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">Info</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500">
            Gunakan username dari tabel petugas atau email yang terdaftar
          </p>
        </div>
      </div>
    </div>
  );
}
