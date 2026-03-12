"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullPageLoader } from "@/components/loading-spinner";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch user role to redirect to the correct dashboard
        const { data: userData } = await supabase
          .from('tb_user')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = userData?.role;
        if (role === 'admin') {
          router.replace("/admin/dashboard");
        } else if (role === 'operator') {
          router.replace("/operator/dashboard");
        } else {
          router.replace("/pegawai/dashboard");
        }
      } else {
        // User is not logged in, redirect to login
        router.replace("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  return <FullPageLoader />;
}
