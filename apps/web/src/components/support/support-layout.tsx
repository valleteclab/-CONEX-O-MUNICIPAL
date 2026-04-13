"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { supportFetch } from "@/lib/api-browser";
import { clearSupportToken } from "@/lib/support-auth-storage";

const navItems = [
  { href: "/suporte-tecnico", label: "Dashboard" },
  { href: "/suporte-tecnico/usuarios", label: "Usuários" },
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
    return <div className="min-h-screen bg-[#f4f8fb] p-8 text-marinha-900">Validando acesso…</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,162,141,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbfd,_#eef4f7)] text-marinha-900">
      <div className="border-b border-marinha-900/8 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">
              Central de suporte
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-marinha-900">Operação técnica da plataforma</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-marinha-900/10 bg-surface px-3 py-1 text-sm text-marinha-700 sm:inline-flex">
              {session?.username}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="rounded-full border border-marinha-900/10 bg-white px-4 py-2 text-sm font-semibold text-marinha-900 transition hover:bg-surface disabled:opacity-60"
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[260px,1fr]">
        <aside className="rounded-[24px] border border-marinha-900/8 bg-white/92 p-4 shadow-card">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-marinha-500">
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
                      ? "bg-municipal-600 text-white"
                      : "text-marinha-700 hover:bg-municipal-600/8 hover:text-marinha-900",
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
