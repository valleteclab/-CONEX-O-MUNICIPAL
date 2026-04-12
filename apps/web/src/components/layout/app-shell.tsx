"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buildEntrarHref } from "@/lib/auth-routes";
import { cn } from "@/lib/cn";
import { SiteFooter } from "./site-footer";

type MainNavItem = {
  href: string;
  label: string;
};

const mainNav: MainNavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/diretorio", label: "Negocios" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/academia", label: "Academia" },
  { href: "/area-da-empresa", label: "Para empresas" },
];

const authPrefixes = [
  "/entrar",
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/plataforma/entrar",
  "/area-da-empresa/entrar",
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

function isAuthPath(pathname: string) {
  return authPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AuthFooter() {
  return (
    <footer className="border-t border-marinha-900/8 px-4 py-6 text-center text-sm text-marinha-500 sm:px-6 lg:px-8">
      Acesso seguro ao Conexao Municipal. Seus dados continuam protegidos pela politica de sessao da plataforma.
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const authPage = isAuthPath(pathname);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col font-sans text-marinha-900",
        authPage
          ? "bg-[radial-gradient(circle_at_top,_rgba(0,162,141,0.12),_transparent_35%),linear-gradient(180deg,_#fafcfe_0%,_#f3f8fb_100%)]"
          : "bg-surface",
      )}
    >
      {authPage ? (
        <header className="border-b border-marinha-900/8 bg-white/75 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="focus-ring rounded-btn font-serif text-lg font-bold text-marinha-900 sm:text-xl">
              Conexao Municipal
            </Link>
            <Link
              href="/"
              className="rounded-btn px-3 py-2 text-sm font-semibold text-municipal-800 transition hover:bg-municipal-600/10"
            >
              Voltar ao site
            </Link>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-50 border-b border-marinha-900/8 bg-surface-card/95 shadow-sm backdrop-blur-md">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="focus-ring shrink-0 rounded-btn font-serif text-lg font-bold text-marinha-900 sm:text-xl"
            >
              Conexao Municipal
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
                href={buildEntrarHref("portal")}
                className={cn(
                  "rounded-btn px-3 py-2 text-sm font-semibold text-municipal-800 transition hover:bg-municipal-600/10",
                  pathname === "/entrar" && "bg-municipal-600/15",
                )}
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
              >
                Criar conta
              </Link>
            </div>

            <button
              type="button"
              className="focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-btn border border-marinha-900/15 bg-white text-marinha-900 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
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
                  href={buildEntrarHref("portal")}
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
                  Criar conta
                </Link>
              </div>
            </div>
          ) : null}
        </header>
      )}

      <main
        className={cn(
          "w-full flex-1",
          authPage
            ? "mx-auto flex max-w-6xl items-start px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
            : "px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
        )}
      >
        {children}
      </main>

      {authPage ? <AuthFooter /> : <SiteFooter />}
    </div>
  );
}
