import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-marinha-900/8 bg-surface-card/80">
      <div className="flex w-full flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-serif text-lg font-bold text-marinha-900">Conexão Municipal</p>
          <p className="mt-1 text-sm text-marinha-500">
            Luís Eduardo Magalhães — BA
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm sm:items-end" aria-label="Rodapé">
          <Link
            href="/plataforma/entrar"
            className="font-medium text-municipal-700 hover:underline"
          >
            Gestão da plataforma (equipa)
          </Link>
          {process.env.NODE_ENV !== "production" ? (
            <Link
              href="/design-system"
              className="font-medium text-municipal-700 hover:underline"
            >
              Guia visual (design system)
            </Link>
          ) : null}
          <span className="text-marinha-500">LGPD · Política de privacidade (em breve)</span>
        </nav>
      </div>
      <div className="border-t border-marinha-900/6 px-4 py-4 text-center text-xs text-marinha-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Conexão Municipal
      </div>
    </footer>
  );
}
