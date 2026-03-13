import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const { data: userData, error } = await supabase
      .from("tb_user")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      redirect("/auth/login");
    }

    if (userData.role === "admin") {
      redirect("/admin/dashboard");
    }

    if (userData.role === "operator") {
      redirect("/operator/dashboard");
    }

    redirect("/pegawai/dashboard");
  } catch {
    redirect("/auth/login");
  }
}
