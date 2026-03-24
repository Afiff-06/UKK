import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse text-blue-600 font-medium">Memuat...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
