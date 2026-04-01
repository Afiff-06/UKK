import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;
  const displayName =
    (user as { user_metadata?: { nama?: string; username?: string }; email?: string } | undefined)?.user_metadata?.nama
    || (user as { user_metadata?: { nama?: string; username?: string }; email?: string } | undefined)?.user_metadata?.username
    || (user as { email?: string } | undefined)?.email
    || "Pengguna";

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {displayName}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
