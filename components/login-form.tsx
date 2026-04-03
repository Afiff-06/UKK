"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Package } from "lucide-react";
import { getLoginErrorMessage } from "@/lib/user-validation";
import { normalizeUsername } from "@/lib/user-normalization";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'blocked') {
      setError("Akun Anda telah ditangguhkan. Silakan hubungi admin.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password.length < 5) {
      setError("Kata sandi minimal 5 karakter.");
      setIsLoading(false);
      return;
    }

    try {
      const normalizedUsername = normalizeUsername(username);
      const { data: account, error: accountError } = await supabase
        .from("tb_user")
        .select("id, email")
        .ilike("username", normalizedUsername)
        .maybeSingle();

      if (accountError) {
        throw new Error("Gagal memuat data akun");
      }

      if (!account) {
        throw new Error(getLoginErrorMessage("username_not_found"));
      }

      if (!account.email) {
        throw new Error(getLoginErrorMessage("missing_email"));
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: password,
      });

      if (authError) {
        throw new Error(getLoginErrorMessage("invalid_password"));
      }

      const { data: userData, error: userError } = await supabase
        .from('tb_user')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        throw new Error("Gagal memuat profil pengguna");
      }

      router.refresh()

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
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Inventaris</h1>
          <p className="text-gray-500 mt-2">Masuk ke akun Anda</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin}>
            {/* Username */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Pengguna
              </label>
              <input
                type="text"
                id="username"
                placeholder="Masukkan nama pengguna"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 text-black bg-gray-50 border border-gray-200 rounded-xl px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Masukkan Kata Sandi"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 text-black bg-gray-50 border border-gray-200 rounded-xl px-4 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <span className="text-sm text-gray-400">Informasi</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500">
            Gunakan nama pengguna dan kata sandi yang terdaftar
          </p>
        </div>
      </div>
    </div>
  );
}
