"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullPageLoader } from "@/components/loading-spinner";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User is logged in, redirect to dashboard
        router.replace("/dashboard");
      } else {
        // User is not logged in, redirect to login
        router.replace("/auth/login");
      }
    };

    checkAuth();
  }, [router, supabase]);

  return <FullPageLoader />;
}
