import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  // IMPORTANT: Do not put any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token — do NOT remove or move this call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const protectedPaths = ["/admin", "/operator", "/pegawai"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = pathname.startsWith("/auth");

  // No session + trying to access protected route → redirect to login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Already logged in + trying to access login/auth pages → redirect to home (which redirects to dashboard)
  if (user && isAuthPage) {
    const { data: userData } = await supabase
      .from('tb_user')
      .select('role')
      .eq('id', user.id)
      .single();
    const url = request.nextUrl.clone();
    if (userData?.role === 'admin') {
      url.pathname = "/admin/dashboard";
    } else if (userData?.role === 'operator') {
      url.pathname = "/operator/dashboard";
    } else {
      url.pathname = "/pegawai/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse as-is to keep session cookies intact
  return supabaseResponse;
}
