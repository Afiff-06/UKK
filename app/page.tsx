"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FullPageLoader } from "@/components/loading-spinner";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          router.replace("/auth/login");
          return;
        }

        if (session) {
          // Fetch user role to redirect to the correct dashboard
          const { data: userData, error: userError } = await supabase
            .from('tb_user')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (userError || !userData) {
            console.error('User profile error:', userError);
            // User exists in auth but not in tb_user, sign out and redirect to login
            await supabase.auth.signOut();
            router.replace("/auth/login");
            return;
          }

          const role = userData.role;
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
      } catch (err) {
        console.error('Auth check failed:', err);
        router.replace("/auth/login");
      }
    };

    // Timeout fallback: if auth check takes too long, redirect to login
    timeoutId = setTimeout(() => {
      console.warn('Auth check timed out, redirecting to login');
      router.replace("/auth/login");
    }, 10000);

    checkAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, [router]);

  return <FullPageLoader />;
}
