"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { SiteFooter } from "./site-footer";

type MainNavItem = {
  href: string;
  label: string;
  /** Destaque no menu: equipa interna (super admin). */
  kind?: "platform";
};

const mainNav: MainNavItem[] = [
  { href: "/", label: "Início" },
  { href: "/diretorio", label: "Diretório" },
  { href: "/cotacoes", label: "Cotações" },
  { href: "/academia", label: "Academia" },
  { href: "/erp", label: "ERP" },
  { href: "/painel", label: "Painel" },
  /** Entrada explícita da equipa interna (super admin) — não confundir com Painel do município. */
  { href: "/plataforma/entrar", label: "Plataforma", kind: "platform" },
];

function navLinkClass(active: boolean) {
  return cn(
    "rounded-btn px-3 py-2 text-sm font-semibold transition-colors",
    active
      ? "bg-municipal-600/15 text-municipal-800"
      : "text-marinha-500 hover:bg-municipal-600/10 hover:text-municipal-800",
  );
}

function isActivePath(
  pathname: string,
  href: string,
  kind?: "platform",
) {
  if (kind === "platform") {
    return (
      pathname === "/plataforma/entrar" || pathname.startsWith("/dashboard/plataforma")
    );
  }
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-marinha-900">
      <header className="sticky top-0 z-50 border-b border-marinha-900/8 bg-surface-card/95 shadow-sm backdrop-blur-md">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="focus-ring shrink-0 rounded-btn font-serif text-lg font-bold text-marinha-900 sm:text-xl"
          >
            Conexão Municipal
          </Link>

          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Principal"
          >
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={
                  item.kind === "platform" ?
                    "Super administrador: moderação e gestão em todos os municípios"
                  : undefined
                }
                className={cn(
                  navLinkClass(isActivePath(pathname, item.href, item.kind)),
                  item.kind === "platform" &&
                    "border border-municipal-600/40 bg-municipal-600/5 text-municipal-900",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/plataforma/entrar"
              className={cn(
                "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-municipal-600 bg-white px-3 py-2 text-sm font-bold text-municipal-900 shadow-sm transition hover:bg-municipal-600/10",
                isActivePath(pathname, "/plataforma/entrar", "platform") && "bg-municipal-600/15",
              )}
              title="Login da equipa Conexão Municipal (super administrador)"
            >
              Área da plataforma
            </Link>
            <Link
              href="/login"
              className={cn(
                "rounded-btn px-3 py-2 text-sm font-semibold text-municipal-800 transition hover:bg-municipal-600/10",
                pathname === "/login" && "bg-municipal-600/15",
              )}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
            >
              Cadastrar
            </Link>
          </div>

          <button
            type="button"
            className="focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-btn border border-marinha-900/15 bg-white text-marinha-900 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">Abrir menu</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div
            id="mobile-menu"
            className="border-t border-marinha-900/8 bg-surface-card px-4 py-4 sm:px-6 lg:px-8 md:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Principal mobile">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-btn px-3 py-3 text-base font-semibold",
                    isActivePath(pathname, item.href, item.kind)
                      ? "bg-municipal-600/15 text-municipal-800"
                      : "text-marinha-700",
                    item.kind === "platform" &&
                      "border-2 border-municipal-600/50 bg-municipal-600/5 font-bold text-municipal-900",
                  )}
                  title={
                    item.kind === "platform" ?
                      "Super administrador: moderação e gestão em todos os municípios"
                    : undefined
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  {item.kind === "platform" ?
                    <span className="mt-0.5 block text-xs font-normal text-marinha-600">
                      Super admin — equipa interna
                    </span>
                  : null}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-marinha-900/8 pt-4">
              <Link
                href="/login"
                className="rounded-btn py-3 text-center text-base font-semibold text-municipal-800"
                onClick={() => setMenuOpen(false)}
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-btn bg-municipal-600 py-3 text-center text-base font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Cadastrar
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
