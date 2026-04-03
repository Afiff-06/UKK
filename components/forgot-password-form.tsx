"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { normalizeUsername } from "@/lib/user-normalization";
import { getLoginErrorMessage } from "@/lib/user-validation";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const normalizedUsername = normalizeUsername(username);
      const { data: account, error: accountError } = await supabase
        .from("tb_user")
        .select("email")
        .ilike("username", normalizedUsername)
        .maybeSingle();

      if (accountError) throw accountError;
      if (!account) throw new Error(getLoginErrorMessage("username_not_found"));
      if (!account.email) throw new Error(getLoginErrorMessage("missing_email"));

      const { error } = await supabase.auth.resetPasswordForEmail(account.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Periksa Email Anda</CardTitle>
              <CardDescription>Instruksi reset kata sandi telah dikirim</CardDescription>
          </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Jika Anda mendaftar menggunakan email dan kata sandi, Anda akan menerima
                email pengaturan ulang kata sandi.
              </p>
            </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Atur Ulang Kata Sandi</CardTitle>
            <CardDescription>
              Masukkan nama pengguna Anda dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="username">Nama Pengguna</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="masukkan nama pengguna"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Mengirim..." : "Kirim email reset"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Sudah punya akun?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Masuk
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
