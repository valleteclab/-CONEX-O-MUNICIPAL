"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { SiteFooter } from "./site-footer";

type MainNavItem = {
  href: string;
  label: string;
};

const mainNav: MainNavItem[] = [
  { href: "/", label: "Início" },
  { href: "/diretorio", label: "Negócios" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/academia", label: "Academia" },
];

function navLinkClass(active: boolean) {
  return cn(
    "rounded-btn px-3 py-2 text-sm font-semibold transition-colors",
    active
      ? "bg-municipal-600/15 text-municipal-800"
      : "text-marinha-500 hover:bg-municipal-600/10 hover:text-municipal-800",
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCompanyArea = pathname.startsWith("/area-da-empresa") || pathname.startsWith("/erp");

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

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Principal">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(isActivePath(pathname, item.href))}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/area-da-empresa"
              className={cn(
                "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-2 text-sm font-semibold text-marinha-900 shadow-sm transition hover:border-municipal-600/40 hover:bg-surface",
                isCompanyArea && "bg-municipal-600/10 text-municipal-900",
              )}
            >
              Área da empresa
            </Link>
            <Link
              href="/admin"
              className={cn(
                "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-municipal-600 bg-white px-3 py-2 text-sm font-bold text-municipal-900 shadow-sm transition hover:bg-municipal-600/10",
                pathname.startsWith("/admin") && "bg-municipal-600/15",
              )}
              title="Painel do super administrador"
            >
              Admin
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
              {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
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
                    isActivePath(pathname, item.href)
                      ? "bg-municipal-600/15 text-municipal-800"
                      : "text-marinha-700",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-marinha-900/8 pt-4">
              <Link
                href="/area-da-empresa"
                className="rounded-btn border border-marinha-900/15 py-3 text-center text-base font-semibold text-marinha-900"
                onClick={() => setMenuOpen(false)}
              >
                Área da empresa
              </Link>
              <Link
                href="/admin"
                className="rounded-btn border-2 border-municipal-600/50 bg-municipal-600/5 py-3 text-center text-base font-bold text-municipal-900"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
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

      <main className="w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
