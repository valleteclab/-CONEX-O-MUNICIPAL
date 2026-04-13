"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { supportFetch } from "@/lib/api-browser";
import { clearSupportToken } from "@/lib/support-auth-storage";

const navItems = [
  { href: "/suporte-tecnico", label: "Dashboard" },
  { href: "/suporte-tecnico/integracoes", label: "Integrações" },
  { href: "/suporte-tecnico/ia", label: "IA" },
];

type SupportMe = {
  username: string;
  displayName: string;
};

export function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/suporte-tecnico/entrar";
  const [session, setSession] = useState<SupportMe | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }
    let mounted = true;
    async function loadSession() {
      const res = await supportFetch<SupportMe>("/api/v1/support-auth/me");
      if (!mounted) return;
      if (!res.ok || !res.data) {
        clearSupportToken();
        router.replace("/suporte-tecnico/entrar");
        return;
      }
      setSession(res.data);
      setChecking(false);
    }
    void loadSession();
    return () => {
      mounted = false;
    };
  }, [isLoginPage, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await supportFetch("/api/v1/support-auth/logout", { method: "POST" });
    clearSupportToken();
    router.push("/suporte-tecnico/entrar");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checking) {
    return <div className="min-h-screen bg-slate-950 text-white p-8">Validando acesso…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">
              Central de suporte
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Operação técnica da plataforma</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 sm:inline-flex">
              {session?.username}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[260px,1fr]">
        <aside className="rounded-[24px] border border-white/10 bg-slate-900/70 p-4 shadow-2xl">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Navegação
          </p>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === "/suporte-tecnico"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-teal-500 text-slate-950"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
